package apps

import (
	"slices"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type StudioModel struct {
	ID            string                  `json:"id"`
	Description   string                  `json:"description"`
	Endpoints     []constant.EndpointType `json:"endpoints"`
	EndpointPaths []string                `json:"endpoint_paths"`
}

func StudioModels(c *gin.Context) {
	user, err := model.GetUserCache(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	// Execution uses the account's current group, as does the host playground.
	allowed := service.GetGroupsEnabledModels([]string{user.Group})
	pricing := model.GetPricing()
	endpointMap := model.GetSupportedEndpointMap()
	result := make([]StudioModel, 0, len(allowed))
	for _, item := range pricing {
		if slices.Contains(allowed, item.ModelName) {
			paths := []string{}
			for _, endpoint := range item.SupportedEndpointTypes {
				if info, ok := endpointMap[string(endpoint)]; ok && info.Method == "POST" {
					paths = append(paths, info.Path)
				}
			}
			result = append(result, StudioModel{ID: item.ModelName, Description: item.Description, Endpoints: item.SupportedEndpointTypes, EndpointPaths: paths})
		}
	}
	common.ApiSuccess(c, result)
}

// ChatModels uses the marketplace's enabled models and account group permissions.
// Return concrete groups so selection and execution always use the same route.
func ChatModels(c *gin.Context) {
	user, err := model.GetUserCache(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	groupsByModel := map[string][]string{}
	for group := range service.GetUserUsableGroups(user.Group) {
		if !service.IsUserSelectableGroup(user.Group, group) {
			continue
		}
		for _, id := range service.GetGroupsEnabledModels([]string{group}) {
			groupsByModel[id] = append(groupsByModel[id], group)
		}
	}
	pricing := model.GetPricing()
	endpointMap := model.GetSupportedEndpointMap()
	type chatModel struct {
		StudioModel
		Groups []string `json:"groups"`
	}
	result := make([]chatModel, 0)
	for _, item := range pricing {
		groups := groupsByModel[item.ModelName]
		if len(groups) == 0 {
			continue
		}
		paths := []string{}
		for _, endpoint := range item.SupportedEndpointTypes {
			if info, ok := endpointMap[string(endpoint)]; ok && info.Method == "POST" {
				paths = append(paths, info.Path)
			}
		}
		if !slices.Contains(paths, "/v1/chat/completions") {
			continue
		}
		slices.Sort(groups)
		result = append(result, chatModel{StudioModel: StudioModel{ID: item.ModelName, Description: item.Description, Endpoints: item.SupportedEndpointTypes, EndpointPaths: paths}, Groups: groups})
	}
	common.ApiSuccess(c, result)
}
