package apps

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// ChatTokens returns only display metadata for the current user's keys.
func ChatTokens(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	page = max(0, min(page, 100000))
	tokens, err := model.GetAllUserTokens(c.GetInt("id"), page*100, 100)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	items := make([]gin.H, 0, len(tokens))
	for _, token := range tokens {
		available := token.Status == common.TokenStatusEnabled && (token.ExpiredTime == -1 || token.ExpiredTime >= common.GetTimestamp()) && (token.UnlimitedQuota || token.RemainQuota > 0)
		items = append(items, gin.H{"id": token.Id, "name": token.Name, "masked_key": token.GetMaskedKey(), "group": token.Group, "available": available})
	}
	common.ApiSuccess(c, gin.H{"items": items, "has_more": len(tokens) == 100})
}
