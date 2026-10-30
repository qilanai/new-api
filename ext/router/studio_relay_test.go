package router

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/stretchr/testify/require"
)

func TestChatKeyOwnershipAndRestrictions(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, i18n.Init())
	owned := &model.Token{UserId: f.user.Id, Name: "owned", Key: "ownedsecrettestkey", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true, ModelLimitsEnabled: true, ModelLimits: "allowed"}
	other := &model.Token{UserId: f.user.Id + 1, Name: "other-private-name", Key: "othersecrettestkey", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true}
	require.NoError(t, model.DB.Create(owned).Error)
	require.NoError(t, model.DB.Create(other).Error)
	require.NoError(t, model.DB.Create(&[]model.Ability{{Group: "default", Model: "allowed", ChannelId: 1, Enabled: true}, {Group: "default", Model: "denied", ChannelId: 1, Enabled: true}}).Error)
	response := f.request("/api/ext/apps/chat/tokens", f.token)
	require.Equal(t, 200, response.Code)
	require.Contains(t, response.Body.String(), "owned")
	require.NotContains(t, response.Body.String(), owned.Key)
	require.NotContains(t, response.Body.String(), other.Name)
	for _, session := range []string{"", "invalid", "ext-apps-legacy-test-token"} {
		require.Contains(t, []int{401, 403}, f.request("/api/ext/apps/chat/tokens", session).Code)
	}
	request := func(id string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/api/ext/apps/chat/relay/v1/models?key="+other.Key, nil)
		r.Header.Set("Authorization", "Bearer "+f.token)
		r.Header.Set("X-New-API-Token-ID", id)
		r.Header.Set("X-API-Key", other.Key)
		r.Header.Set("X-Goog-API-Key", other.Key)
		r.Header.Set("Sec-WebSocket-Protocol", "openai-insecure-api-key."+other.Key)
		r.Header.Set("X-New-API-Group", "private")
		w := httptest.NewRecorder()
		f.router.ServeHTTP(w, r)
		return w
	}
	response = request(strconv.Itoa(owned.Id))
	require.Equal(t, 200, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "allowed")
	require.NotContains(t, response.Body.String(), "denied")
	require.NotContains(t, response.Body.String(), "private")
	require.Equal(t, 400, request("").Code)
	require.Equal(t, 403, request(strconv.Itoa(other.Id)).Code)
	require.Equal(t, 403, request("999999").Code)
	for _, update := range []map[string]any{
		{"status": common.TokenStatusDisabled},
		{"expired_time": time.Now().Add(-time.Minute).Unix()},
		{"unlimited_quota": false, "remain_quota": 0},
		{"allow_ips": "203.0.113.0/24"},
	} {
		require.NoError(t, model.DB.Model(owned).Updates(update).Error)
		require.Contains(t, []int{401, 403}, request(strconv.Itoa(owned.Id)).Code)
		require.NoError(t, model.DB.Model(owned).Updates(map[string]any{"status": common.TokenStatusEnabled, "expired_time": -1, "unlimited_quota": true, "allow_ips": ""}).Error)
	}
	require.NoError(t, model.DB.Delete(owned).Error)
	require.Equal(t, 403, request(strconv.Itoa(owned.Id)).Code)
}

func TestStudioAndChatRelayBilling(t *testing.T) {
	for _, tc := range []struct{ name, app, group string }{
		{"Studio default group", "studio", "default"},
		{"Chat marketplace group", "chat", "vip"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := setupApps(t)
			require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP"}`))
			require.NoError(t, i18n.Init())
			oldRatios, err := common.Marshal(ratio_setting.GetModelRatioCopy())
			require.NoError(t, err)
			require.NoError(t, ratio_setting.UpdateModelRatioByJSONString(`{"gpt-4o":1}`))
			oldBatch, oldCount := common.BatchUpdateEnabled, constant.CountToken
			common.BatchUpdateEnabled, constant.CountToken = false, false
			t.Cleanup(func() {
				require.NoError(t, ratio_setting.UpdateModelRatioByJSONString(string(oldRatios)))
				common.BatchUpdateEnabled, constant.CountToken = oldBatch, oldCount
			})
			oldCache := common.MemoryCacheEnabled
			common.MemoryCacheEnabled = false
			t.Cleanup(func() { common.MemoryCacheEnabled = oldCache })
			require.NoError(t, model.DB.AutoMigrate(&model.Log{}))
			require.NoError(t, model.DB.Model(f.user).Update("quota", 2_000_000).Error)
			var calls atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				require.Equal(t, "/v1/chat/completions", r.URL.Path)
				require.Equal(t, "Bearer upstream-test-key", r.Header.Get("Authorization"))
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"id":"test","object":"chat.completion","model":"gpt-4o","choices":[{"index":0,"message":{"role":"assistant","content":"hello"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}`))
			}))
			defer upstream.Close()
			channel := &model.Channel{Name: "studio-test", Key: "upstream-test-key", Status: common.ChannelStatusEnabled, Type: constant.ChannelTypeOpenAI, Group: tc.group, Models: "gpt-4o", BaseURL: &upstream.URL}
			require.NoError(t, channel.Insert())
			key := &model.Token{UserId: f.user.Id, Name: "chat-selected-key", Key: "chatselectedtestkey", Status: common.TokenStatusEnabled, ExpiredTime: -1, RemainQuota: 2_000_000, Group: tc.group, ModelLimitsEnabled: true, ModelLimits: "gpt-4o"}
			if tc.app == "chat" {
				require.NoError(t, model.DB.Create(key).Error)
			}
			request := func(token, body string) *httptest.ResponseRecorder {
				r := httptest.NewRequest("POST", "/api/ext/apps/"+tc.app+"/relay/v1/chat/completions", strings.NewReader(body))
				r.Header.Set("Content-Type", "application/json")
				r.Header.Set("X-New-API-Group", tc.group)
				r.Header.Set("Authorization", "Bearer "+token)
				if tc.app == "chat" {
					r.Header.Set("X-New-API-Token-ID", strconv.Itoa(key.Id))
				}
				w := httptest.NewRecorder()
				f.router.ServeHTTP(w, r)
				return w
			}
			body := `{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}],"max_tokens":10}`
			response := request(f.token, body)
			require.Equal(t, 200, response.Code, response.Body.String())
			require.EqualValues(t, 1, calls.Load())
			var user model.User
			require.NoError(t, model.DB.First(&user, f.user.Id).Error)
			require.Less(t, user.Quota, 2_000_000)
			require.Greater(t, user.UsedQuota, 0)
			var tokens int64
			require.NoError(t, model.DB.Model(&model.Token{}).Count(&tokens).Error)
			if tc.app == "chat" {
				require.EqualValues(t, 1, tokens)
				stored, err := model.GetTokenByIds(key.Id, f.user.Id)
				require.NoError(t, err)
				require.Greater(t, stored.UsedQuota, 0)
				require.Equal(t, user.UsedQuota, stored.UsedQuota)
				require.Equal(t, 2_000_000-stored.UsedQuota, stored.RemainQuota)
				var log model.Log
				require.NoError(t, model.DB.Where("type = ?", model.LogTypeConsume).First(&log).Error)
				require.Equal(t, key.Id, log.TokenId)
				require.Equal(t, key.Name, log.TokenName)
				response = request(f.token, `{"model":"forbidden-model","messages":[{"role":"user","content":"hello"}]}`)
				require.NotEqual(t, http.StatusOK, response.Code)
				require.EqualValues(t, 1, calls.Load())
			} else {
				require.Zero(t, tokens)
			}
			response = request(f.token, `{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}],"max_tokens":18446744073686646784}`)
			require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
			require.EqualValues(t, 1, calls.Load(), "oversized generation must be rejected before an upstream call")
			response = request("not-a-session", body)
			require.Contains(t, []int{401, 403}, response.Code)
			require.EqualValues(t, 1, calls.Load())
		})
	}
}
