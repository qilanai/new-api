package router

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
)

func registerStudioRelay(router *gin.Engine) {
	group := router.Group("/api/ext/apps/studio/relay/v1")
	group.Use(middleware.RouteTag("relay"), middleware.DisableCache(), middleware.SystemPerformanceCheck(), middleware.UserAuth(), requireBrowserSession)
	group.Use(func(c *gin.Context) {
		c.Request.URL.Path = "/v1" + strings.TrimPrefix(c.Request.URL.Path, "/api/ext/apps/studio/relay/v1")
		c.Set("ext_studio_session", true)
		// Studio always operates on the signed-in user's resources, including
		// when that user is a gateway administrator.
		c.Set("role", common.RoleCommonUser)
		user, err := model.GetUserCache(c.GetInt("id"))
		if err != nil {
			common.ApiError(c, err)
			c.Abort()
			return
		}
		user.WriteContext(c)
		if err := middleware.SetupContextForToken(c, &model.Token{UserId: user.Id, Name: "Studio", Group: user.Group}); err != nil {
			common.ApiError(c, err)
			c.Abort()
			return
		}
		common.SetContextKey(c, constant.ContextKeyUsingGroup, user.Group)
	})
	group.Use(middleware.ModelRequestRateLimit())
	for _, path := range []string{"/chat/completions", "/audio/speech", "/audio/transcriptions"} {
		group.POST(path, middleware.Distribute(), func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAI) })
	}
	for _, path := range []string{"/images/generations", "/images/edits"} {
		group.POST(path, middleware.PinTaskPluginEndpoint(), middleware.PrepareTaskPluginEndpoint(), middleware.Distribute(), func(c *gin.Context) {
			controller.RelayTaskPluginEndpoint(c, func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAIImage) })
		})
	}
	group.POST("/responses", middleware.PinTaskPluginEndpoint(), middleware.PrepareTaskPluginEndpoint(), middleware.Distribute(), func(c *gin.Context) {
		controller.RelayTaskPluginEndpoint(c, func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAIResponses) })
	})
	group.POST("/videos", middleware.PinTaskPluginEndpoint(), middleware.PrepareTaskPluginEndpoint(), middleware.Distribute(), func(c *gin.Context) { controller.RelayTaskPluginEndpoint(c, controller.RelayTask) })
	group.GET("/videos/:task_id", middleware.Distribute(), controller.RelayTaskFetch)
	group.GET("/videos/:task_id/content", controller.VideoProxy)
}
