package ext

import (
	"time"

	"github.com/QuantumNous/new-api/common"
	assetcontroller "github.com/QuantumNous/new-api/ext/controller/assets"
	assetmodel "github.com/QuantumNous/new-api/ext/model"
	"github.com/QuantumNous/new-api/model"
)

// Init is the fork runtime entry point, called after the host resources are
// available. The application catalog currently needs no additional resources.
func Init() error {
	if common.IsMasterNode {
		if err := model.DB.AutoMigrate(&assetmodel.Asset{}, &assetmodel.AssetUsage{}); err != nil {
			return err
		}
	}
	go func() {
		assetcontroller.CleanupStale()
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			assetcontroller.CleanupStale()
		}
	}()
	return nil
}
