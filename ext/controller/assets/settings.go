package assets

import (
	"net/http"
	"net/url"
	"os"

	"github.com/QuantumNous/new-api/common"
	assetsetting "github.com/QuantumNous/new-api/ext/setting/assets"
	"github.com/gin-gonic/gin"
)

func GetSettings(c *gin.Context) {
	settings, err := assetsetting.Load()
	if err != nil {
		fail(c, http.StatusServiceUnavailable, "Invalid asset settings")
		return
	}
	common.ApiSuccess(c, gin.H{
		"settings":        settings,
		"oss_region":      os.Getenv("EXT_ASSETS_OSS_REGION"),
		"oss_bucket":      os.Getenv("EXT_ASSETS_OSS_BUCKET"),
		"oss_endpoint":    safeEndpoint(),
		"credential_mode": credentialMode(),
	})
}

func safeEndpoint() string {
	endpoint := os.Getenv("EXT_ASSETS_OSS_ENDPOINT")
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return ""
	}
	return endpoint
}

func credentialMode() string {
	if os.Getenv("EXT_ASSETS_OSS_ECS_ROLE") != "" {
		return "ecs_role"
	}
	if os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_ID") != "" && os.Getenv("EXT_ASSETS_OSS_ACCESS_KEY_SECRET") != "" {
		return "environment"
	}
	return "unconfigured"
}

func UpdateSettings(c *gin.Context) {
	var settings assetsetting.Config
	if err := common.DecodeJson(http.MaxBytesReader(c.Writer, c.Request.Body, 8192), &settings); err != nil || assetsetting.Validate(settings) != nil {
		fail(c, http.StatusBadRequest, "Invalid asset settings")
		return
	}
	if err := assetsetting.Save(settings); err != nil {
		fail(c, http.StatusInternalServerError, "Unable to update asset settings")
		return
	}
	common.ApiSuccess(c, settings)
}
