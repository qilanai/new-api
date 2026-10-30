package assets

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	extmodel "github.com/QuantumNous/new-api/ext/model"
	storage "github.com/QuantumNous/new-api/ext/service/assets"
	assetsetting "github.com/QuantumNous/new-api/ext/setting/assets"
	"github.com/QuantumNous/new-api/model"
	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss/credentials"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var uploadSlots = make(chan struct{}, 8)

type objectStore interface {
	Put(context.Context, string, io.Reader, int64, string) error
	Delete(context.Context, string) error
	DownloadURL(context.Context, string, time.Duration, bool) (string, error)
}

type listedAsset struct {
	extmodel.Asset
	PreviewURL *string `json:"preview_url,omitempty"`
}

func isInlinePreviewContentType(contentType string) bool {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/png", "image/jpeg", "image/gif", "image/webp",
		"video/mp4", "video/webm", "video/ogg", "video/quicktime",
		"audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm":
		return true
	default:
		return false
	}
}

var newStore = store

func store() (objectStore, error) {
	var provider credentials.CredentialsProvider = credentials.NewStaticCredentialsProvider(os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_ID"), os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_SECRET"), os.Getenv("EXT_ASSETS_OSS_SESSION_TOKEN"))
	if role := os.Getenv("EXT_ASSETS_OSS_ECS_ROLE"); role != "" {
		provider = credentials.NewEcsRoleCredentialsProvider(credentials.EcsRamRole(role))
	} else if os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_ID") == "" || os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_SECRET") == "" {
		return nil, errors.New("OSS credentials are not configured")
	}
	return storage.NewOSSStore(os.Getenv("EXT_ASSETS_OSS_REGION"), os.Getenv("EXT_ASSETS_OSS_BUCKET"), os.Getenv("EXT_ASSETS_OSS_ENDPOINT"), provider)
}

func fail(c *gin.Context, status int, message string) {
	common.ApiErrorStatus(c, status, common.NewMessage(message))
}

func validName(name string) bool {
	return name != "" && utf8.ValidString(name) && len(name) <= 255 && !strings.ContainsAny(name, "\x00\r\n")
}

func List(c *gin.Context) {
	settings, err := assetsetting.Load()
	if err != nil {
		fail(c, 503, "Invalid asset settings")
		return
	}
	userQuota := settings.UserQuotaBytes
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	if page > 100000 {
		page = 100000
	}
	size, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}
	owner := c.GetInt("id")
	q := model.DB.Model(&extmodel.Asset{}).Where("owner_user_id = ? AND status = ?", owner, "ready")
	switch c.Query("type") {
	case "", "all":
	case "image", "audio", "video":
		q = q.Where("content_type LIKE ?", c.Query("type")+"/%")
	case "other":
		q = q.Where("content_type NOT LIKE ? AND content_type NOT LIKE ? AND content_type NOT LIKE ?", "image/%", "audio/%", "video/%")
	default:
		fail(c, http.StatusBadRequest, "Invalid asset filter")
		return
	}
	for _, filter := range []struct{ key, operator string }{{"created_after", ">="}, {"created_before", "<="}} {
		if value := c.Query(filter.key); value != "" {
			timestamp, err := strconv.ParseInt(value, 10, 64)
			if err != nil || timestamp < 0 {
				fail(c, http.StatusBadRequest, "Invalid asset filter")
				return
			}
			q = q.Where("created_at "+filter.operator+" ?", timestamp)
		}
	}
	if name := strings.TrimSpace(c.Query("search")); name != "" {
		// Escape LIKE metacharacters rather than allowing search to expand scope.
		name = strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(name)
		q = q.Where("name LIKE ? ESCAPE '!'", "%"+name+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		fail(c, 500, "Unable to list assets")
		return
	}
	items := make([]extmodel.Asset, 0)
	if err := q.Order("created_at DESC, id DESC").Offset((page - 1) * size).Limit(size).Find(&items).Error; err != nil {
		fail(c, 500, "Unable to list assets")
		return
	}
	var usage extmodel.AssetUsage
	if err := model.DB.First(&usage, "owner_user_id = ?", owner).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		fail(c, 500, "Unable to list assets")
		return
	}
	var previewStore objectStore
	if s, err := newStore(); err == nil {
		previewStore = s
	}
	listed := make([]listedAsset, len(items))
	for i := range items {
		listed[i] = listedAsset{Asset: items[i]}
		if previewStore != nil && isInlinePreviewContentType(items[i].ContentType) {
			if url, err := previewStore.DownloadURL(c.Request.Context(), items[i].ObjectKey, 5*time.Minute, true); err == nil {
				listed[i].PreviewURL = &url
			}
		}
	}
	common.ApiSuccess(c, gin.H{"items": listed, "total": total, "page": page, "page_size": size, "used_bytes": usage.UsedBytes, "quota_bytes": userQuota})
}

func Get(c *gin.Context) {
	asset, err := extmodel.FindAsset(model.DB, c.GetInt("id"), c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fail(c, 404, "Asset not found")
		} else {
			fail(c, 500, "Unable to access asset")
		}
		return
	}
	common.ApiSuccess(c, asset)
}

func Upload(c *gin.Context) {
	select {
	case uploadSlots <- struct{}{}:
		defer func() { <-uploadSlots }()
	default:
		fail(c, http.StatusTooManyRequests, "Too many uploads")
		return
	}
	settings, err := assetsetting.Load()
	if err != nil {
		fail(c, 503, "Invalid asset settings")
		return
	}
	if !settings.Enabled {
		fail(c, 403, "Asset uploads are disabled")
		return
	}
	maxUpload, userQuota := settings.MaxFileBytes, settings.UserQuotaBytes
	s, err := newStore()
	if err != nil {
		fail(c, 503, "Asset storage is not configured")
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUpload+(1<<20))
	reader, err := c.Request.MultipartReader()
	if err != nil {
		fail(c, 400, "Invalid upload")
		return
	}
	part, err := reader.NextPart()
	if err != nil || part.FormName() != "file" {
		fail(c, 400, "A file is required")
		return
	}
	defer part.Close()
	name := filepath.Base(strings.ReplaceAll(part.FileName(), "\\", "/"))
	if !validName(name) || name == "." {
		fail(c, 400, "Invalid file name")
		return
	}
	file, err := os.CreateTemp("", "new-api-asset-*")
	if err != nil {
		fail(c, 500, "Unable to upload asset")
		return
	}
	defer os.Remove(file.Name())
	defer file.Close()
	size, err := io.Copy(file, io.LimitReader(part, maxUpload+1))
	if err != nil || size == 0 || size > maxUpload {
		fail(c, 413, "File exceeds upload limit or is empty")
		return
	}
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		fail(c, 500, "Unable to upload asset")
		return
	}
	var sample [512]byte
	n, err := file.Read(sample[:])
	if err != nil && err != io.EOF {
		fail(c, 500, "Unable to upload asset")
		return
	}
	contentType := http.DetectContentType(sample[:n])
	if allowed := settings.AllowedContentTypes; allowed != "" {
		accepted := false
		detectedType, _, _ := mime.ParseMediaType(contentType)
		for _, item := range strings.Split(allowed, ",") {
			if strings.EqualFold(strings.TrimSpace(item), detectedType) {
				accepted = true
				break
			}
		}
		if !accepted {
			fail(c, http.StatusUnsupportedMediaType, "File type is not allowed")
			return
		}
	}
	_, _ = file.Seek(0, io.SeekStart)
	var random [16]byte
	if _, err = rand.Read(random[:]); err != nil {
		fail(c, 500, "Unable to upload asset")
		return
	}
	id := hex.EncodeToString(random[:])
	owner := c.GetInt("id")
	asset := &extmodel.Asset{ID: id, OwnerUserID: owner, ObjectKey: fmt.Sprintf("assets/users/%d/%s", owner, id), Name: name, OriginalName: name, ContentType: contentType, ReservedBytes: size, Status: "uploading"}
	if err = extmodel.ReserveAsset(model.DB, asset, userQuota); err != nil {
		if errors.Is(err, extmodel.ErrAssetQuotaExceeded) {
			fail(c, 413, "Asset storage quota exceeded")
		} else {
			fail(c, 500, "Unable to upload asset")
		}
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()
	err = s.Put(ctx, asset.ObjectKey, file, size, contentType)
	if err == nil {
		err = extmodel.CompleteAsset(model.DB, asset, size, contentType)
	}
	if err != nil {
		// A failed PUT can still have reached OSS. Keep the reservation unless
		// a separately timed deletion succeeds; this permits later cleanup.
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		if s.Delete(cleanupCtx, asset.ObjectKey) == nil {
			if err := extmodel.RemoveAssetRecord(model.DB, asset); err != nil {
				common.SysError(common.LogText("ext: asset cleanup record update failed for %s", asset.ID))
			}
		} else {
			common.SysError(common.LogText("ext: asset cleanup failed for %s", asset.ID))
		}
		fail(c, 502, "Unable to upload asset")
		return
	}
	asset.SizeBytes = size
	asset.ReservedBytes = size
	asset.Status = "ready"
	common.ApiSuccess(c, asset)
}

func Rename(c *gin.Context) {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || !validName(strings.TrimSpace(input.Name)) {
		fail(c, 400, "Invalid file name")
		return
	}
	result := model.DB.Model(&extmodel.Asset{}).Where("id = ? AND owner_user_id = ? AND status = ?", c.Param("id"), c.GetInt("id"), "ready").Update("name", strings.TrimSpace(input.Name))
	if result.Error != nil {
		fail(c, 500, "Unable to update asset")
		return
	}
	if result.RowsAffected == 0 { // MySQL may report zero for unchanged values.
		if _, err := extmodel.FindAsset(model.DB, c.GetInt("id"), c.Param("id")); err != nil {
			fail(c, 404, "Asset not found")
			return
		}
	}
	common.ApiSuccess(c, nil)
}

func Delete(c *gin.Context) {
	asset, err := extmodel.FindAsset(model.DB, c.GetInt("id"), c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fail(c, 404, "Asset not found")
		} else {
			fail(c, 500, "Unable to access asset")
		}
		return
	}
	s, err := newStore()
	if err != nil {
		fail(c, 503, "Asset storage is not configured")
		return
	}
	result := model.DB.Model(&extmodel.Asset{}).Where("id = ? AND owner_user_id = ? AND status = ?", asset.ID, asset.OwnerUserID, "ready").Update("status", "deleting")
	if result.Error != nil {
		fail(c, 500, "Unable to delete asset")
		return
	}
	if result.RowsAffected != 1 {
		fail(c, 404, "Asset not found")
		return
	}
	asset.Status = "deleting"
	if err = s.Delete(c.Request.Context(), asset.ObjectKey); err != nil {
		fail(c, 502, "Unable to delete asset")
		return
	}
	if err = extmodel.RemoveAssetRecord(model.DB, asset); err != nil {
		fail(c, 500, "Unable to delete asset")
		return
	}
	common.ApiSuccess(c, nil)
}

func DownloadURL(c *gin.Context) {
	asset, err := extmodel.FindAsset(model.DB, c.GetInt("id"), c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fail(c, 404, "Asset not found")
		} else {
			fail(c, 500, "Unable to access asset")
		}
		return
	}
	s, err := newStore()
	if err != nil {
		fail(c, 503, "Asset storage is not configured")
		return
	}
	inline := c.Query("preview") == "true" && isInlinePreviewContentType(asset.ContentType)
	url, err := s.DownloadURL(c.Request.Context(), asset.ObjectKey, 5*time.Minute, inline)
	if err != nil {
		fail(c, 502, "Unable to access asset")
		return
	}
	common.ApiSuccess(c, gin.H{"url": url, "expires_in": 300})
}

// CleanupStale retries operations that did not reach their final database
// transition. Uploads have a ten-minute OSS timeout and are not considered
// abandoned until an hour has elapsed.
func CleanupStale() {
	s, err := newStore()
	if err != nil {
		return
	}
	var pending []extmodel.Asset
	if err := model.DB.Where("status IN ? AND updated_at < ?", []string{"uploading", "deleting"}, time.Now().Add(-time.Hour).Unix()).Limit(100).Find(&pending).Error; err != nil {
		common.SysError(common.LogText("ext: asset cleanup query failed"))
		return
	}
	for _, asset := range pending {
		result := model.DB.Model(&extmodel.Asset{}).Where("id = ? AND owner_user_id = ? AND status = ? AND updated_at = ?", asset.ID, asset.OwnerUserID, asset.Status, asset.UpdatedAt).Update("status", "deleting")
		if result.Error != nil || result.RowsAffected != 1 {
			continue
		}
		asset.Status = "deleting"
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		err := s.Delete(ctx, asset.ObjectKey)
		cancel()
		if err != nil {
			common.SysError(common.LogText("ext: asset cleanup failed for %s", asset.ID))
			continue
		}
		if err = extmodel.RemoveAssetRecord(model.DB, &asset); err != nil {
			common.SysError(common.LogText("ext: asset cleanup record update failed for %s", asset.ID))
		}
	}
}
