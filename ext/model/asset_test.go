package model

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestAssetIsolationAndQuota(t *testing.T) {
	databases := []struct {
		name string
		open func(t *testing.T) gorm.Dialector
	}{
		{"sqlite", func(t *testing.T) gorm.Dialector {
			if dsn := os.Getenv("TEST_SQLITE_DSN"); dsn != "" {
				return sqlite.Open(dsn)
			}
			return sqlite.Open(filepath.Join(t.TempDir(), "asset.db"))
		}},
		{"mysql", func(t *testing.T) gorm.Dialector {
			dsn := os.Getenv("TEST_MYSQL_DSN")
			if dsn == "" {
				t.Skip("TEST_MYSQL_DSN not set")
			}
			return mysql.Open(dsn)
		}},
		{"postgres", func(t *testing.T) gorm.Dialector {
			dsn := os.Getenv("TEST_POSTGRES_DSN")
			if dsn == "" {
				t.Skip("TEST_POSTGRES_DSN not set")
			}
			return postgres.Open(dsn)
		}},
	}
	for _, tc := range databases {
		t.Run(tc.name, func(t *testing.T) {
			db, err := gorm.Open(tc.open(t), &gorm.Config{})
			require.NoError(t, err)
			if tc.name == "sqlite" {
				var version string
				require.NoError(t, db.Raw("select sqlite_version()").Scan(&version).Error)
				t.Logf("SQLite %s", version)
			}
			sqlDB, err := db.DB()
			require.NoError(t, err)
			if tc.name == "sqlite" {
				sqlDB.SetMaxOpenConns(1)
			}
			t.Cleanup(func() { _ = sqlDB.Close() })
			require.NoError(t, db.AutoMigrate(&Asset{}, &AssetUsage{}))
			require.NoError(t, db.AutoMigrate(&Asset{}, &AssetUsage{}))
			owner := 741852
			require.NoError(t, db.Where("owner_user_id = ?", owner).Delete(&Asset{}).Error)
			require.NoError(t, db.Where("owner_user_id = ?", owner).Delete(&AssetUsage{}).Error)
			t.Cleanup(func() {
				db.Where("owner_user_id = ?", owner).Delete(&Asset{})
				db.Where("owner_user_id = ?", owner).Delete(&AssetUsage{})
			})
			asset := &Asset{ID: "asset-test-1", OwnerUserID: owner, ObjectKey: fmt.Sprintf("test/%d/1", owner), Name: "a", OriginalName: "a", ContentType: "application/octet-stream", ReservedBytes: 8, Status: "uploading"}
			require.NoError(t, ReserveAsset(db, asset, 10))
			duplicate := *asset
			duplicate.ID = "duplicate-object"
			require.Error(t, db.Create(&duplicate).Error, "object keys must remain unique")
			second := &Asset{ID: "asset-test-2", OwnerUserID: owner, ObjectKey: "test/2", Name: "b", OriginalName: "b", ContentType: "application/octet-stream", ReservedBytes: 3, Status: "uploading"}
			require.ErrorIs(t, ReserveAsset(db, second, 10), ErrAssetQuotaExceeded)
			require.NoError(t, CompleteAsset(db, asset, 5, "image/png"))
			_, err = FindAsset(db, owner+1, asset.ID)
			require.ErrorIs(t, err, gorm.ErrRecordNotFound)
			found, err := FindAsset(db, owner, asset.ID)
			require.NoError(t, err)
			require.EqualValues(t, 5, found.SizeBytes)
			require.NoError(t, ReserveAsset(db, second, 10))
			require.NoError(t, RemoveAssetRecord(db, found))
			var usage AssetUsage
			require.NoError(t, db.First(&usage, "owner_user_id = ?", owner).Error)
			require.EqualValues(t, 3, usage.UsedBytes)
			// Concurrent requests must not reserve more than the remaining quota.
			var wg sync.WaitGroup
			errs := make(chan error, 8)
			for i := range 8 {
				wg.Add(1)
				go func() {
					defer wg.Done()
					a := &Asset{ID: fmt.Sprintf("concurrent-%d", i), OwnerUserID: owner, ObjectKey: fmt.Sprintf("test/concurrent-%d", i), Name: "c", OriginalName: "c", ContentType: "application/octet-stream", ReservedBytes: 2, Status: "uploading"}
					errs <- ReserveAsset(db, a, 9)
				}()
			}
			wg.Wait()
			close(errs)
			for err := range errs {
				if err != nil {
					require.ErrorIs(t, err, ErrAssetQuotaExceeded)
				}
			}
			require.NoError(t, db.First(&usage, "owner_user_id = ?", owner).Error)
			require.LessOrEqual(t, usage.UsedBytes, int64(9))
		})
	}
}
