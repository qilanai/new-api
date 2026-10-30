package apps

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type Application struct {
	ID           string `json:"id"`
	Availability string `json:"availability"`
}

func List(c *gin.Context) {
	common.ApiSuccess(c, []Application{
		{ID: "chat", Availability: "available"},
		{ID: "studio", Availability: "preview"},
		{ID: "sites", Availability: "planned"},
	})
}

func StudioBootstrap(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"user_id":  c.GetInt("id"),
		"username": c.GetString("username"),
	})
}

func ChatBootstrap(c *gin.Context) {
	user, err := model.GetUserCache(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	allowed := service.GetGroupsEnabledModels([]string{user.Group})
	if allowed == nil {
		allowed = []string{}
	}
	defaultModel := ""
	if len(allowed) > 0 {
		defaultModel = allowed[0]
	}
	common.ApiSuccess(c, gin.H{
		"user_id":       user.Id,
		"username":      user.Username,
		"default_model": defaultModel,
		"models":        allowed,
		"user": gin.H{
			"id":           user.Id,
			"username":     user.Username,
			"display_name": user.Username,
			"group":        user.Group,
		},
	})
}
