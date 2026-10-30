package assets

import (
	"bytes"
	"context"
	"errors"
	"github.com/QuantumNous/new-api/common"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	extmodel "github.com/QuantumNous/new-api/ext/model"
	assetsetting "github.com/QuantumNous/new-api/ext/setting/assets"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type fakeStore struct {
	putErr, deleteErr error
	deleted           int
}

func (s *fakeStore) Put(_ context.Context, _ string, body io.Reader, _ int64, _ string) error {
	_, _ = io.Copy(io.Discard, body)
	return s.putErr
}
func (s *fakeStore) Delete(_ context.Context, _ string) error { s.deleted++; return s.deleteErr }
func (s *fakeStore) DownloadURL(_ context.Context, _ string, _ time.Duration, _ bool) (string, error) {
	return "https://example.test/signed", nil
}

func TestUploadFailureRetainsReservationUntilCleanup(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "assets.db")), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}, &model.Option{}))
	oldDB, oldStore := model.DB, newStore
	model.DB = db
	fake := &fakeStore{putErr: errors.New("upload failed"), deleteErr: errors.New("delete failed")}
	newStore = func() (objectStore, error) { return fake, nil }
	t.Cleanup(func() { model.DB = oldDB; newStore = oldStore; sqlDB, _ := db.DB(); _ = sqlDB.Close() })
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/", func(c *gin.Context) { c.Set("id", 7); Upload(c) })
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "a.txt")
	require.NoError(t, err)
	_, err = part.Write([]byte("hello"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())
	req := httptest.NewRequest(http.MethodPost, "/", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadGateway, rec.Code)
	var usage extmodel.AssetUsage
	require.NoError(t, db.First(&usage, "owner_user_id = ?", 7).Error)
	require.EqualValues(t, 5, usage.UsedBytes)
	require.NoError(t, db.Model(&extmodel.Asset{}).Where("owner_user_id = ?", 7).UpdateColumn("updated_at", time.Now().Add(-2*time.Hour).Unix()).Error)
	fake.deleteErr = nil
	CleanupStale()
	require.NoError(t, db.First(&usage, "owner_user_id = ?", 7).Error)
	require.Zero(t, usage.UsedBytes)
	var count int64
	require.NoError(t, db.Model(&extmodel.Asset{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestUploadCreatesOwnedAsset(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "assets.db")), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}, &model.Option{}))
	oldDB, oldStore := model.DB, newStore
	model.DB = db
	fake := &fakeStore{}
	newStore = func() (objectStore, error) { return fake, nil }
	t.Cleanup(func() { model.DB = oldDB; newStore = oldStore; sqlDB, _ := db.DB(); _ = sqlDB.Close() })
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/", func(c *gin.Context) { c.Set("id", 7); List(c) })
	router.POST("/", func(c *gin.Context) { c.Set("id", 7); Upload(c) })
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "a.txt")
	require.NoError(t, err)
	_, err = part.Write([]byte("hello"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())
	req := httptest.NewRequest(http.MethodPost, "/", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	var asset extmodel.Asset
	require.NoError(t, db.First(&asset).Error)
	require.Equal(t, 7, asset.OwnerUserID)
	require.Equal(t, "ready", asset.Status)
	require.EqualValues(t, 5, asset.SizeBytes)
	require.NotContains(t, rec.Body.String(), asset.ObjectKey)

	require.NoError(t, db.Create(&extmodel.Asset{
		ID:            "img-1",
		OwnerUserID:   7,
		ObjectKey:     "assets/users/7/img-1",
		Name:          "preview.png",
		OriginalName:  "preview.png",
		ContentType:   "image/png",
		SizeBytes:     64,
		ReservedBytes: 64,
		Status:        "ready",
	}).Error)
	listReq := httptest.NewRequest(http.MethodGet, "/", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"preview_url":"https://example.test/signed"`)
}

func TestSettingsPersistAndEnforcePolicy(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "settings.db")), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}, &model.Option{}))
	oldDB, oldStore, oldOptions := model.DB, newStore, common.OptionMap
	model.DB = db
	common.OptionMap = make(map[string]string)
	newStore = func() (objectStore, error) { return &fakeStore{}, nil }
	t.Cleanup(func() {
		model.DB = oldDB
		newStore = oldStore
		common.OptionMap = oldOptions
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	router := gin.New()
	router.PUT("/settings", UpdateSettings)
	router.POST("/upload", func(c *gin.Context) { c.Set("id", 7); Upload(c) })
	req := httptest.NewRequest(http.MethodPut, "/settings", strings.NewReader(`{"enabled":false,"max_file_bytes":1024,"user_quota_bytes":2048,"allowed_content_types":"image/png"}`))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, 200, rec.Code)
	req = httptest.NewRequest(http.MethodPost, "/upload", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, 403, rec.Code)
	req = httptest.NewRequest(http.MethodPut, "/settings", strings.NewReader(`{"enabled":true,"max_file_bytes":-1,"user_quota_bytes":2048,"allowed_content_types":"image/png"}`))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, 400, rec.Code)
	req = httptest.NewRequest(http.MethodPost, "/upload", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, 403, rec.Code)
}

func TestSettingsWithSupportedDatabases(t *testing.T) {
	cases := []struct {
		name, dsn string
		dialector func(string) gorm.Dialector
	}{
		{"sqlite", os.Getenv("TEST_SQLITE_DSN"), sqlite.Open},
		{"mysql", os.Getenv("TEST_MYSQL_DSN"), mysql.Open},
		{"postgres", os.Getenv("TEST_POSTGRES_DSN"), postgres.Open},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.dsn == "" {
				t.Skip("database DSN not supplied")
			}
			db, err := gorm.Open(tc.dialector(tc.dsn), &gorm.Config{})
			require.NoError(t, err)
			sqlDB, err := db.DB()
			require.NoError(t, err)
			defer sqlDB.Close()
			oldDB, oldOptions := model.DB, common.OptionMap
			model.DB = db
			common.OptionMap = make(map[string]string)
			defer func() { model.DB = oldDB; common.OptionMap = oldOptions }()
			var previous model.Option
			previousErr := db.Where(&model.Option{Key: "ext_assets.settings"}).First(&previous).Error
			require.True(t, previousErr == nil || errors.Is(previousErr, gorm.ErrRecordNotFound))
			require.NoError(t, db.Where(&model.Option{Key: "ext_assets.settings"}).Delete(&model.Option{}).Error)
			defer func() {
				_ = db.Where(&model.Option{Key: "ext_assets.settings"}).Delete(&model.Option{}).Error
				if previousErr == nil {
					_ = db.Create(&previous).Error
				}
			}()
			settings := assetsetting.Config{Enabled: false, MaxFileBytes: 1024, UserQuotaBytes: 4096, AllowedContentTypes: "image/png"}
			require.NoError(t, assetsetting.Save(settings))
			actual, err := assetsetting.Load()
			require.NoError(t, err)
			require.Equal(t, settings, actual)
		})
	}
}

func TestMimeAllowListMatchesDetectedTypeWithoutParameters(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "mime.db")), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&extmodel.Asset{}, &extmodel.AssetUsage{}, &model.Option{}))
	oldDB, oldStore, oldOptions := model.DB, newStore, common.OptionMap
	model.DB = db
	common.OptionMap = make(map[string]string)
	newStore = func() (objectStore, error) { return &fakeStore{}, nil }
	t.Cleanup(func() {
		model.DB = oldDB
		newStore = oldStore
		common.OptionMap = oldOptions
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	require.NoError(t, assetsetting.Save(assetsetting.Config{Enabled: true, MaxFileBytes: 100, UserQuotaBytes: 100, AllowedContentTypes: "text/plain"}))
	router := gin.New()
	router.POST("/", func(c *gin.Context) { c.Set("id", 7); Upload(c) })
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "test.txt")
	require.NoError(t, err)
	_, err = part.Write([]byte("hello"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())
	req := httptest.NewRequest(http.MethodPost, "/", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
}
