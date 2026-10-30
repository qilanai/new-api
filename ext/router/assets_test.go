package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	extmodel "github.com/QuantumNous/new-api/ext/model"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestAssetRoutesEnforceOwnership(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, model.DB.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}))
	other := &model.User{Username: "other-asset-user", Password: "unused", Status: 1, Role: 1, Group: "default", AffCode: "other-asset-user", AuthVersion: 1}
	require.NoError(t, model.DB.Create(other).Error)
	asset := extmodel.Asset{ID: "other-asset", OwnerUserID: other.Id, ObjectKey: "assets/test/other", Name: "private", OriginalName: "private", ContentType: "image/png", SizeBytes: 1, ReservedBytes: 1, Status: "ready"}
	require.NoError(t, model.DB.Create(&asset).Error)
	for _, test := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/ext/assets/other-asset", ""},
		{http.MethodPatch, "/api/ext/assets/other-asset", `{"name":"stolen"}`},
		{http.MethodDelete, "/api/ext/assets/other-asset", ""},
		{http.MethodPost, "/api/ext/assets/other-asset/download-url", ""},
	} {
		req := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
		req.Header.Set("Authorization", "Bearer "+f.token)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		f.router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusNotFound, rec.Code, test.path)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/ext/assets", nil)
	req.Header.Set("Authorization", "Bearer "+f.token)
	rec := httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	require.NotContains(t, rec.Body.String(), "private")
	req = httptest.NewRequest(http.MethodGet, "/api/ext/assets", nil)
	rec = httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	require.NotEqual(t, http.StatusOK, rec.Code)
	key := &model.Token{UserId: f.user.Id, Key: "assetsapitestkey", Status: 1, Name: "asset test", ExpiredTime: -1, UnlimitedQuota: true}
	require.NoError(t, model.DB.Create(key).Error)
	req = httptest.NewRequest(http.MethodGet, "/v1/assets/other-asset", nil)
	req.Header.Set("Authorization", "Bearer sk-"+key.Key)
	rec = httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNotFound, rec.Code)
}

func TestAssetSettingsRequiresRoot(t *testing.T) {
	f := setupApps(t)
	for _, method := range []string{http.MethodGet, http.MethodPut} {
		req := httptest.NewRequest(method, "/api/ext/assets-settings", strings.NewReader(`{"enabled":true,"max_file_bytes":1024,"user_quota_bytes":2048,"allowed_content_types":""}`))
		req.Header.Set("Authorization", "Bearer "+f.token)
		rec := httptest.NewRecorder()
		f.router.ServeHTTP(rec, req)
		require.NotEqual(t, http.StatusOK, rec.Code)
	}
}

func TestAssetSettingsRootAccess(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, model.DB.Model(f.user).Update("role", common.RoleRootUser).Error)
	t.Setenv("EXT_ASSETS_OSS_ACCESS_KEY_SECRET", "should-not-be-returned")
	req := httptest.NewRequest(http.MethodGet, "/api/ext/assets-settings", nil)
	req.Header.Set("Authorization", "Bearer "+f.token)
	rec := httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	require.NotContains(t, rec.Body.String(), "should-not-be-returned")
}

func TestAssetDateFilterIncludesBothEndpoints(t *testing.T) {
	f := setupApps(t)
	require.NoError(t, model.DB.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}))
	for _, asset := range []extmodel.Asset{
		{ID: "before", OwnerUserID: f.user.Id, ObjectKey: "test/before", Name: "before", OriginalName: "before", ContentType: "text/plain", ReservedBytes: 1, Status: "ready", CreatedAt: 99},
		{ID: "start", OwnerUserID: f.user.Id, ObjectKey: "test/start", Name: "start", OriginalName: "start", ContentType: "text/plain", ReservedBytes: 1, Status: "ready", CreatedAt: 100},
		{ID: "end", OwnerUserID: f.user.Id, ObjectKey: "test/end", Name: "end", OriginalName: "end", ContentType: "text/plain", ReservedBytes: 1, Status: "ready", CreatedAt: 200},
		{ID: "after", OwnerUserID: f.user.Id, ObjectKey: "test/after", Name: "after", OriginalName: "after", ContentType: "text/plain", ReservedBytes: 1, Status: "ready", CreatedAt: 201},
	} {
		require.NoError(t, model.DB.Create(&asset).Error)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/ext/assets?created_after=100&created_before=200", nil)
	req.Header.Set("Authorization", "Bearer "+f.token)
	rec := httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"id":"start"`)
	require.Contains(t, rec.Body.String(), `"id":"end"`)
	require.NotContains(t, rec.Body.String(), `"id":"before"`)
	require.NotContains(t, rec.Body.String(), `"id":"after"`)
}
