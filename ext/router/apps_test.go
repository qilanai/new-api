package router

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type appsFixture struct {
	router *gin.Engine
	user   *model.User
	sid    string
	token  string
}

func setupApps(t *testing.T) appsFixture {
	t.Helper()
	oldDB, oldLogDB := model.DB, model.LOG_DB
	oldRedis, oldSecret := common.RedisEnabled, common.SessionSecret
	oldType, oldLogType := common.MainDatabaseType(), common.LogDatabaseType()
	oldSQLitePath, oldMaster := common.SQLitePath, common.IsMasterNode
	oldGroups := setting.UserUsableGroups2JSONString()
	t.Setenv("SQL_DSN", "local")
	common.SQLitePath = filepath.Join(t.TempDir(), "apps.db")
	common.IsMasterNode = true
	require.NoError(t, model.InitDB())
	db := model.DB
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	require.NoError(t, db.AutoMigrate(&model.AuditLog{}))
	model.DB, model.LOG_DB = db, db
	common.RedisEnabled, common.SessionSecret = false, "ext-apps-test-only-secret"
	common.SetMainDatabaseType(common.DatabaseTypeSQLite)
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default group"}`))
	t.Cleanup(func() {
		model.DB, model.LOG_DB = oldDB, oldLogDB
		common.RedisEnabled, common.SessionSecret = oldRedis, oldSecret
		common.SetDatabaseTypes(oldType, oldLogType)
		common.SQLitePath, common.IsMasterNode = oldSQLitePath, oldMaster
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(oldGroups))
		require.NoError(t, sqlDB.Close())
	})
	require.NoError(t, model.EnsureLegacyAccessTokenRetireAt(time.Now().Unix()))
	legacyPAT := "ext-apps-legacy-test-token"
	user := &model.User{
		Username: "studio-user", Password: "unused-placeholder", Role: common.RoleCommonUser,
		Status: common.UserStatusEnabled, Group: "default", AuthVersion: 1,
		AffCode: "studio-test", AccessToken: &legacyPAT,
	}
	require.NoError(t, db.Create(user).Error)
	sid := "studio-browser-session"
	require.NoError(t, model.CreateUserSession(&model.UserSession{
		SID: sid, UserID: user.Id, Version: 1, UserAuthVersion: 1,
		RefreshHash: "test-only-digest", ExpiresAt: time.Now().Add(time.Hour).Unix(),
	}))
	token, _, err := service.IssueAccessToken(service.AuthIdentity{
		UserID: user.Id, SessionID: sid, UserAuthVersion: 1, SessionVersion: 1,
	})
	require.NoError(t, err)
	router := gin.New()
	SetExtRouter(router)
	return appsFixture{router: router, user: user, sid: sid, token: token}
}

func (f appsFixture) request(path, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	f.router.ServeHTTP(response, request)
	return response
}

func TestApplicationsRequireLiveBrowserSession(t *testing.T) {
	for _, tc := range []struct {
		name   string
		mutate func(*testing.T, appsFixture) string
	}{
		{"anonymous", func(_ *testing.T, _ appsFixture) string { return "" }},
		{"PAT", func(_ *testing.T, _ appsFixture) string { return "ext-apps-legacy-test-token" }},
		{"invalid signature", func(_ *testing.T, f appsFixture) string { return f.token + "invalid" }},
		{"expired session", func(t *testing.T, f appsFixture) string {
			require.NoError(t, model.DB.Model(&model.UserSession{}).Where("sid = ?", f.sid).Update("expires_at", time.Now().Add(-time.Minute).Unix()).Error)
			return f.token
		}},
		{"revoked session replay", func(t *testing.T, f appsFixture) string {
			revoked, err := model.RevokeUserSession(f.user.Id, f.sid, "test")
			require.NoError(t, err)
			require.True(t, revoked)
			return f.token
		}},
		{"disabled account", func(t *testing.T, f appsFixture) string {
			require.NoError(t, model.DB.Model(f.user).Update("status", common.UserStatusDisabled).Error)
			return f.token
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := setupApps(t)
			token := tc.mutate(t, f)
			for _, path := range []string{"/api/ext/apps", "/api/ext/apps/studio/bootstrap", "/api/ext/apps/studio/models", "/api/ext/apps/chat/bootstrap", "/api/ext/apps/chat/models", "/api/ext/apps/chat/catalog", "/api/ext/apps/chat/relay/v1/models"} {
				response := f.request(path, token)
				assert.Contains(t, []int{http.StatusUnauthorized, http.StatusForbidden}, response.Code, path)
				assert.NotContains(t, response.Body.String(), "model_catalog")
			}
		})
	}
}

func TestApplicationsExposeHonestAvailabilityAndCurrentIdentity(t *testing.T) {
	f := setupApps(t)
	response := f.request("/api/ext/apps", f.token)
	require.Equal(t, http.StatusOK, response.Code)
	assert.Contains(t, response.Header().Get("Cache-Control"), "no-store")
	assert.JSONEq(t, `{"success":true,"message":"","data":[{"id":"chat","availability":"available"},{"id":"studio","availability":"preview"},{"id":"sites","availability":"planned"}]}`, response.Body.String())
	response = f.request("/api/ext/apps/studio/bootstrap?user_id=999", f.token)
	require.Equal(t, http.StatusOK, response.Code)
	assert.JSONEq(t, fmt.Sprintf(`{"success":true,"message":"","data":{"user_id":%d,"username":"studio-user"}}`, f.user.Id), response.Body.String())

	response = f.request("/api/ext/apps/chat/bootstrap?user_id=999", f.token)
	require.Equal(t, http.StatusOK, response.Code)
	assert.JSONEq(t, fmt.Sprintf(`{"success":true,"message":"","data":{"user_id":%d,"username":"studio-user","default_model":"","models":[],"user":{"id":%d,"username":"studio-user","display_name":"studio-user","group":"default"}}}`, f.user.Id, f.user.Id), response.Body.String())

	request := httptest.NewRequest(http.MethodPost, "/api/ext/apps/studio/tasks", nil)
	request.Header.Set("Authorization", "Bearer "+f.token)
	response = httptest.NewRecorder()
	f.router.ServeHTTP(response, request)
	assert.Equal(t, http.StatusNotFound, response.Code)
}

func TestStudioModelsFollowHostVisibility(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, model.DB.Create(&[]model.Ability{
		{Group: "default", Model: "visible-model", ChannelId: 1, Enabled: true},
		{Group: "default", Model: "visible-model", ChannelId: 2, Enabled: true},
		{Group: "default", Model: "disabled-model", ChannelId: 3, Enabled: false},
		{Group: "private", Model: "private-model", ChannelId: 4, Enabled: true},
	}).Error)
	for _, tc := range []struct{ query, want string }{
		{"", `["visible-model"]`},
		{"?id=999&user_id=999", `["visible-model"]`},
		{"?group=private", `[]`},
		{"?group=auto", `[]`},
	} {
		response := f.request("/api/ext/apps/studio/models"+tc.query, f.token)
		require.Equal(t, http.StatusOK, response.Code)
		assert.JSONEq(t, `{"success":true,"message":"","data":`+tc.want+`}`, response.Body.String())
	}
	require.NoError(t, model.DB.Model(&model.Ability{}).Where("enabled = ?", true).Update("enabled", false).Error)
	response := f.request("/api/ext/apps/studio/models", f.token)
	assert.JSONEq(t, `{"success":true,"message":"","data":[]}`, response.Body.String())
}

func TestWorkspaceDocumentUsesFixedTarget(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/apps/workspace/assets/app.js", r.URL.Path)
		assert.NotEqual(t, "attacker.example", r.Header.Get("X-Forwarded-Host"))
		w.Header().Set("Content-Type", "text/javascript")
		_, err := w.Write([]byte("/* LobeHub web */"))
		assert.NoError(t, err)
	}))
	defer upstream.Close()
	t.Setenv("EXT_CHAT_UPSTREAM_URL", upstream.URL)
	engine := gin.New()
	registerWorkspaceDocument(engine)
	request := httptest.NewRequest(http.MethodGet, "/apps/workspace/assets/app.js", nil)
	ctx, cancel := context.WithCancel(request.Context())
	defer cancel()
	request = request.WithContext(ctx)
	request.Header.Set("X-Forwarded-Host", "attacker.example")
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)
	assert.Equal(t, http.StatusOK, response.Code)
	assert.Equal(t, "/* LobeHub web */", response.Body.String())
	for _, path := range []string{"/apps/nextchat", "/apps/nextchat/assets/app.js"} {
		response = httptest.NewRecorder()
		engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		assert.Equal(t, http.StatusNotFound, response.Code)
	}
}

func TestWorkspaceDocumentReportsMissingConfiguration(t *testing.T) {
	t.Setenv("EXT_CHAT_UPSTREAM_URL", "")
	t.Setenv("EXT_WORKSPACE_UPSTREAM_URL", "")
	engine := gin.New()
	registerWorkspaceDocument(engine)
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/apps/workspace/", nil))
	assert.Equal(t, http.StatusServiceUnavailable, response.Code)
	assert.Contains(t, response.Body.String(), "Workspace")
	assert.Equal(t, "no-store", response.Header().Get("Cache-Control"))
}

func TestChatCatalogAndRelayFollowMarketplaceGroups(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, i18n.Init())
	oldCache := common.MemoryCacheEnabled
	common.MemoryCacheEnabled = false
	model.InvalidatePricingCache()
	t.Cleanup(func() { common.MemoryCacheEnabled = oldCache; model.InvalidatePricingCache() })
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP"}`))
	for _, channel := range []model.Channel{
		{Name: "default", Type: constant.ChannelTypeOpenAI, Key: "test", Status: common.ChannelStatusEnabled, Group: "default", Models: "default-chat,shared-chat"},
		{Name: "vip", Type: constant.ChannelTypeOpenAI, Key: "test", Status: common.ChannelStatusEnabled, Group: "vip", Models: "vip-chat,shared-chat"},
		{Name: "private", Type: constant.ChannelTypeOpenAI, Key: "test", Status: common.ChannelStatusEnabled, Group: "private", Models: "private-chat"},
		{Name: "disabled", Type: constant.ChannelTypeOpenAI, Key: "test", Status: common.ChannelStatusManuallyDisabled, Group: "default", Models: "disabled-chat"},
	} {
		require.NoError(t, channel.Insert())
	}
	response := f.request("/api/ext/apps/chat/catalog", f.token)
	require.Equal(t, http.StatusOK, response.Code)
	var catalog struct {
		Data []struct {
			ID     string   `json:"id"`
			Groups []string `json:"groups"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &catalog))
	groups := map[string][]string{}
	for _, item := range catalog.Data {
		groups[item.ID] = item.Groups
	}
	require.Equal(t, map[string][]string{"default-chat": {"default"}, "vip-chat": {"vip"}, "shared-chat": {"default", "vip"}}, groups)
	for _, group := range []string{"", "vip", "private", "auto", "missing"} {
		key := &model.Token{UserId: f.user.Id, Name: "chat", Key: "chattest" + group, Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true, Group: group}
		require.NoError(t, model.DB.Create(key).Error)
		request := httptest.NewRequest(http.MethodGet, "/api/ext/apps/chat/relay/v1/models", nil)
		request.Header.Set("Authorization", "Bearer "+f.token)
		request.Header.Set("X-New-API-Token-ID", strconv.Itoa(key.Id))
		request.Header.Set("X-New-API-Group", group)
		response := httptest.NewRecorder()
		f.router.ServeHTTP(response, request)
		if group == "" || group == "vip" {
			require.Equal(t, http.StatusOK, response.Code)
			if group == "vip" {
				assert.Contains(t, response.Body.String(), "vip-chat")
				assert.NotContains(t, response.Body.String(), "default-chat")
			}
		} else {
			require.Equal(t, http.StatusForbidden, response.Code, group)
		}
	}
	// A catalog already loaded by the browser must not preserve revoked access.
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	request := httptest.NewRequest(http.MethodPost, "/api/ext/apps/chat/relay/v1/chat/completions", nil)
	request.Header.Set("Authorization", "Bearer "+f.token)
	request.Header.Set("X-New-API-Group", "vip")
	key := &model.Token{UserId: f.user.Id, Name: "revoked-group", Key: "revokedgroupkey", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true, Group: "vip"}
	require.NoError(t, model.DB.Create(key).Error)
	request.Header.Set("X-New-API-Token-ID", strconv.Itoa(key.Id))
	response = httptest.NewRecorder()
	f.router.ServeHTTP(response, request)
	require.Equal(t, http.StatusForbidden, response.Code)
}

func TestLegacyChatDocumentsRedirectToWorkspace(t *testing.T) {
	engine := gin.New()
	registerWorkspaceDocument(engine)
	for _, tc := range []struct{ from, to string }{
		{"/apps/lobehub", "/apps/workspace/chat"},
		{"/apps/lobehub/", "/apps/workspace/chat"},
		{"/apps/workspace", "/apps/workspace/"},
		{"/apps/lobehub/?conversation=abc", "/apps/workspace/chat?conversation=abc"},
	} {
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, tc.from, nil))
		assert.Equal(t, http.StatusTemporaryRedirect, response.Code)
		assert.Equal(t, tc.to, response.Header().Get("Location"))
	}
}
