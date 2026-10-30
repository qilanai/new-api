package assets

import (
	"errors"
	"mime"
	"os"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/config"
	"gorm.io/gorm"
)

const optionKey = "ext_assets.settings"

// Config contains only non-secret, mutable policy. OSS location and credentials
// stay in deployment configuration because existing objects depend on them.
type Config struct {
	Enabled             bool   `json:"enabled"`
	MaxFileBytes        int64  `json:"max_file_bytes"`
	UserQuotaBytes      int64  `json:"user_quota_bytes"`
	AllowedContentTypes string `json:"allowed_content_types"`
}

var registered struct {
	Settings string `json:"settings"`
}

func init() { config.GlobalConfig.Register("ext_assets", &registered) }

func envLimit(key string, fallback, max int64) int64 {
	n, err := strconv.ParseInt(os.Getenv(key), 10, 64)
	if err != nil || n <= 0 || n > max {
		return fallback
	}
	return n
}

func Defaults() Config {
	return Config{Enabled: true, MaxFileBytes: envLimit("EXT_ASSETS_MAX_FILE_BYTES", 100<<20, 5<<30), UserQuotaBytes: envLimit("EXT_ASSETS_USER_QUOTA_BYTES", 1<<30, 1<<40), AllowedContentTypes: strings.TrimSpace(os.Getenv("EXT_ASSETS_ALLOWED_CONTENT_TYPES"))}
}

func Validate(value Config) error {
	if value.MaxFileBytes <= 0 || value.MaxFileBytes > 5<<30 || value.UserQuotaBytes <= 0 || value.UserQuotaBytes > 1<<40 {
		return errors.New("Invalid asset settings")
	}
	if len(value.AllowedContentTypes) > 4096 {
		return errors.New("Invalid asset settings")
	}
	if value.AllowedContentTypes != "" {
		for _, item := range strings.Split(value.AllowedContentTypes, ",") {
			item = strings.TrimSpace(item)
			parsed, params, err := mime.ParseMediaType(item)
			if err != nil || !strings.Contains(parsed, "/") || len(params) != 0 || strings.Contains(parsed, "*") {
				return errors.New("Invalid asset settings")
			}
		}
	}
	return nil
}

// Load reads one atomically persisted value on each request, so all application
// nodes enforce the same policy without relying on delayed option refresh.
func Load() (Config, error) {
	value := Defaults()
	var option model.Option
	err := model.DB.Where(&model.Option{Key: optionKey}).First(&option).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return value, Validate(value)
	}
	if err != nil {
		return Config{}, err
	}
	if option.Value == "" {
		return value, Validate(value)
	}
	if err := common.UnmarshalJsonStr(option.Value, &value); err != nil {
		return Config{}, err
	}
	return value, Validate(value)
}

func Save(value Config) error {
	value.AllowedContentTypes = strings.TrimSpace(value.AllowedContentTypes)
	if err := Validate(value); err != nil {
		return err
	}
	encoded, err := common.Marshal(value)
	if err != nil {
		return err
	}
	return model.UpdateOptionsBulk(map[string]string{optionKey: string(encoded)})
}
