package router

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func registerChatRelay(router *gin.Engine) {
	group := router.Group("/api/ext/apps/chat/relay/v1")
	group.Use(middleware.RouteTag("relay"), middleware.DisableCache(), middleware.SystemPerformanceCheck(), middleware.UserAuth(), requireBrowserSession)
	group.Use(chatTokenAuth)
	group.GET("/models", func(c *gin.Context) {
		usingGroup := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
		groups := []string{usingGroup}
		if usingGroup == "auto" {
			groups = service.GetRequestAutoGroups(c, common.GetContextKeyString(c, constant.ContextKeyUserGroup))
		}
		allowed := service.GetGroupsEnabledModels(groups)
		limits, _ := c.Get("token_model_limit")
		modelLimits, _ := limits.(map[string]bool)
		items := make([]gin.H, 0, len(allowed))
		for _, modelID := range allowed {
			if c.GetBool("token_model_limit_enabled") && !modelLimits[modelID] {
				continue
			}
			items = append(items, gin.H{
				"id":       modelID,
				"object":   "model",
				"owned_by": "gateway",
			})
		}
		c.JSON(http.StatusOK, gin.H{
			"object": "list",
			"data":   items,
			"group":  usingGroup,
		})
	})
	execGroup := group.Group("")
	execGroup.Use(middleware.ModelRequestRateLimit())
	for _, path := range []string{"/chat/completions", "/completions", "/embeddings", "/moderations", "/audio/speech", "/audio/transcriptions", "/audio/translations"} {
		execGroup.POST(path, middleware.Distribute(), func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAI) })
	}
	execGroup.POST("/rerank", middleware.Distribute(), func(c *gin.Context) { controller.Relay(c, types.RelayFormatRerank) })
	for _, path := range []string{"/images/generations", "/images/edits"} {
		execGroup.POST(path, middleware.PinTaskPluginEndpoint(), middleware.PrepareTaskPluginEndpoint(), middleware.Distribute(), func(c *gin.Context) {
			controller.RelayTaskPluginEndpoint(c, func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAIImage) })
		})
	}
	execGroup.POST("/responses", middleware.PinTaskPluginEndpoint(), middleware.PrepareTaskPluginEndpoint(), middleware.Distribute(), func(c *gin.Context) {
		controller.RelayTaskPluginEndpoint(c, func(c *gin.Context) { controller.Relay(c, types.RelayFormatOpenAIResponses) })
	})
}

// Resolve an owned key only after browser authentication. The browser never
// receives a usable key; normal token authorization and billing remain in force.
func chatTokenAuth(c *gin.Context) {
	id, err := strconv.Atoi(c.GetHeader("X-New-API-Token-ID"))
	if err != nil || id <= 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "CHAT_TOKEN_REQUIRED", "message": "请选择 API 密钥后发送。"}})
		return
	}
	token, err := model.GetTokenByIds(id, c.GetInt("id"))
	if err != nil || token.Status != common.TokenStatusEnabled || (token.ExpiredTime != -1 && token.ExpiredTime < common.GetTimestamp()) || (!token.UnlimitedQuota && token.RemainQuota <= 0) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "CHAT_TOKEN_UNAVAILABLE", "message": "此 API 密钥不可用，请检查状态、有效期和额度，或重新选择。"}})
		return
	}
	c.Request.URL.Path = "/v1" + strings.TrimPrefix(c.Request.URL.Path, "/api/ext/apps/chat/relay/v1")
	c.Set("role", common.RoleCommonUser)
	originalHeaders := c.Request.Header
	c.Request.Header = originalHeaders.Clone()
	defer func() { c.Request.Header = originalHeaders }()
	// TokenAuth accepts alternate credential transports. None may override the
	// key whose ownership was just verified against the signed-in user.
	for _, name := range []string{"X-API-Key", "X-Goog-API-Key", "Sec-WebSocket-Protocol", "Mj-Api-Secret", "X-New-API-Group"} {
		c.Request.Header.Del(name)
	}
	query := c.Request.URL.Query()
	query.Del("key")
	c.Request.URL.RawQuery = query.Encode()
	c.Request.Header.Set("Authorization", "Bearer sk-"+token.Key)
	middleware.TokenAuth()(c)
}
