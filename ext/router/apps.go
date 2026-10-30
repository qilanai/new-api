package router

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/ext/controller/apps"
	"github.com/QuantumNous/new-api/ext/controller/assets"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func SetExtRouter(router *gin.Engine) {
	settings := router.Group("/api/ext/assets-settings", middleware.RouteTag("api"), middleware.DisableCache(), middleware.GlobalAPIRateLimit(), middleware.RootAuth(), requireBrowserSession)
	settings.GET("", assets.GetSettings)
	settings.PUT("", auditAsset("asset.settings"), assets.UpdateSettings)
	assetDashboard := router.Group("/api/ext/assets", middleware.RouteTag("api"), middleware.DisableCache(), middleware.GlobalAPIRateLimit(), middleware.UserAuth(), requireBrowserSession)
	registerAssetRoutes(assetDashboard)
	assetAPI := router.Group("/v1/assets", middleware.RouteTag("api"), middleware.DisableCache(), middleware.GlobalAPIRateLimit(), middleware.TokenAuth())
	registerAssetRoutes(assetAPI)
	registerStudioDocument(router)
	registerStudioRelay(router)
	registerWorkspaceDocument(router)
	registerChatRelay(router)
	appRoutes := router.Group("/api/ext/apps")
	appRoutes.Use(middleware.RouteTag("api"), middleware.DisableCache(), middleware.AccessTokenAudit(), middleware.GlobalAPIRateLimit(), middleware.UserAuth(), requireBrowserSession)
	appRoutes.GET("", apps.List)
	appRoutes.GET("/studio/bootstrap", apps.StudioBootstrap)
	// Reuse the host's user/group model visibility. This directory does not
	// advertise verified Studio operations or provide an execution endpoint.
	appRoutes.GET("/studio/models", controller.GetUserModels)
	appRoutes.GET("/studio/catalog", apps.StudioModels)
	appRoutes.GET("/chat/bootstrap", apps.ChatBootstrap)
	appRoutes.GET("/chat/models", controller.GetUserModels)
	appRoutes.GET("/chat/catalog", apps.ChatModels)
	appRoutes.GET("/chat/tokens", apps.ChatTokens)
}

func registerAssetRoutes(routes *gin.RouterGroup) {
	routes.GET("", assets.List)
	routes.POST("", middleware.UploadRateLimit(), middleware.UserCriticalRateLimit("asset-upload"), auditAsset("asset.upload"), assets.Upload)
	routes.GET("/:id", assets.Get)
	routes.PATCH("/:id", auditAsset("asset.rename"), assets.Rename)
	routes.DELETE("/:id", auditAsset("asset.delete"), assets.Delete)
	routes.POST("/:id/download-url", middleware.DownloadRateLimit(), middleware.UserCriticalRateLimit("asset-download"), auditAsset("asset.download_url"), assets.DownloadURL)
}

func auditAsset(action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		authMethod := "session"
		if c.GetInt("token_id") != 0 {
			authMethod = "api_key"
		}
		model.RecordAuditLog(c, model.AuditLog{UserId: c.GetInt("id"), ActorRole: c.GetInt("role"), Category: model.AuditCategoryOperation, Action: action, AuthMethod: authMethod, Success: c.Writer.Status() < 400, Content: c.Param("id")})
	}
}

func requireBrowserSession(c *gin.Context) {
	if _, ok := middleware.GetSessionAuthIdentity(c); !ok {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"code":    "AUTH_SESSION_REQUIRED",
			"message": common.NewMessage("a dashboard login session is required"),
		})
		return
	}
	c.Next()
}
