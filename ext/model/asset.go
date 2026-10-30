package model

import (
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrAssetQuotaExceeded = errors.New("asset storage quota exceeded")

// Asset tracks both visible objects and objects awaiting cleanup. ObjectKey is
// never supplied by a client and is intentionally omitted from API responses.
type Asset struct {
	ID            string `gorm:"primaryKey;size:32" json:"id"`
	OwnerUserID   int    `gorm:"not null;index:idx_ext_asset_owner_status_created,priority:1" json:"-"`
	ObjectKey     string `gorm:"size:191;not null;uniqueIndex" json:"-"`
	Name          string `gorm:"size:255;not null" json:"name"`
	OriginalName  string `gorm:"size:255;not null" json:"original_name"`
	ContentType   string `gorm:"size:128;not null" json:"content_type"`
	SizeBytes     int64  `gorm:"not null" json:"size_bytes"`
	ReservedBytes int64  `gorm:"not null" json:"-"`
	Status        string `gorm:"size:16;not null;index:idx_ext_asset_owner_status_created,priority:2" json:"status"`
	CreatedAt     int64  `gorm:"autoCreateTime;index:idx_ext_asset_owner_status_created,priority:3" json:"created_at"`
	UpdatedAt     int64  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Asset) TableName() string { return "ext_assets" }

type AssetUsage struct {
	OwnerUserID int   `gorm:"primaryKey"`
	UsedBytes   int64 `gorm:"not null"`
}

func (AssetUsage) TableName() string { return "ext_asset_usage" }

// ReserveAsset atomically reserves the upper bound before the upload starts.
// It includes in-flight uploads, so concurrent requests cannot exceed quota.
func ReserveAsset(db *gorm.DB, asset *Asset, limit int64) error {
	if asset.OwnerUserID <= 0 || asset.ReservedBytes <= 0 || limit < asset.ReservedBytes {
		return ErrAssetQuotaExceeded
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&AssetUsage{OwnerUserID: asset.OwnerUserID}).Error; err != nil {
			return err
		}
		result := tx.Model(&AssetUsage{}).Where("owner_user_id = ? AND used_bytes <= ?", asset.OwnerUserID, limit-asset.ReservedBytes).
			UpdateColumn("used_bytes", gorm.Expr("used_bytes + ?", asset.ReservedBytes))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrAssetQuotaExceeded
		}
		return tx.Create(asset).Error
	})
}

func FindAsset(db *gorm.DB, owner int, id string) (*Asset, error) {
	var asset Asset
	err := db.Where("owner_user_id = ? AND id = ? AND status = ?", owner, id, "ready").First(&asset).Error
	return &asset, err
}

// CompleteAsset converts a reservation to the actual object size atomically.
func CompleteAsset(db *gorm.DB, asset *Asset, size int64, contentType string) error {
	if size < 0 || size > asset.ReservedBytes {
		return ErrAssetQuotaExceeded
	}
	return db.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&Asset{}).Where("id = ? AND owner_user_id = ? AND status = ?", asset.ID, asset.OwnerUserID, "uploading").
			Updates(map[string]any{"status": "ready", "size_bytes": size, "content_type": contentType, "reserved_bytes": size})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}
		return tx.Model(&AssetUsage{}).Where("owner_user_id = ?", asset.OwnerUserID).
			UpdateColumn("used_bytes", gorm.Expr("used_bytes - ?", asset.ReservedBytes-size)).Error
	})
}

// RemoveAssetRecord is called only after the object has been removed from OSS.
func RemoveAssetRecord(db *gorm.DB, asset *Asset) error {
	return db.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("id = ? AND owner_user_id = ? AND status = ?", asset.ID, asset.OwnerUserID, asset.Status).Delete(&Asset{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return nil
		}
		usage := tx.Model(&AssetUsage{}).Where("owner_user_id = ? AND used_bytes >= ?", asset.OwnerUserID, asset.ReservedBytes).
			UpdateColumn("used_bytes", gorm.Expr("used_bytes - ?", asset.ReservedBytes))
		if usage.Error != nil {
			return usage.Error
		}
		if usage.RowsAffected != 1 {
			return errors.New("asset usage is inconsistent")
		}
		return nil
	})
}
