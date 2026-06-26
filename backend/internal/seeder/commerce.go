package seeder

import (
	"context"
	"database/sql"
	"log"
	"time"

	"lumi-backend/internal/database"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/utils"
)

func seedCommerce(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	zones, _ := q.ListActiveDeliveryZones(ctx)
	if len(zones) == 0 {
		nairobiID := utils.GenerateBinaryID()
		if err := q.CreateDeliveryZone(ctx, sqlc.CreateDeliveryZoneParams{
			ID:            nairobiID,
			Name:          "Nairobi Metro",
			BaseCost:      "500.00",
			EstimatedDays: "2-4 days",
		}); err != nil {
			return err
		}
		_ = q.CreateDeliveryZoneArea(ctx, sqlc.CreateDeliveryZoneAreaParams{
			ID: utils.GenerateBinaryID(), ZoneID: nairobiID,
			AreaType: sqlc.DeliveryZoneAreasAreaTypeCity, AreaName: "Nairobi",
		})
		mombasaID := utils.GenerateBinaryID()
		if err := q.CreateDeliveryZone(ctx, sqlc.CreateDeliveryZoneParams{
			ID:            mombasaID,
			Name:          "Coast Region",
			BaseCost:      "800.00",
			EstimatedDays: "4-6 days",
		}); err != nil {
			return err
		}
		_ = q.CreateDeliveryZoneArea(ctx, sqlc.CreateDeliveryZoneAreaParams{
			ID: utils.GenerateBinaryID(), ZoneID: mombasaID,
			AreaType: sqlc.DeliveryZoneAreasAreaTypeCity, AreaName: "Mombasa",
		})
		log.Println("Created delivery zones")
	}

	count, _ := q.CountAllCoupons(ctx)
	if count == 0 {
		expires := time.Now().AddDate(0, 6, 0)
		if err := q.CreateCoupon(ctx, sqlc.CreateCouponParams{
			ID:             utils.GenerateBinaryID(),
			Code:           "WELCOME10",
			Type:           sqlc.CouponsTypePercentage,
			Value:          "10.00",
			MinOrderAmount: "2000.00",
			MaxDiscount:    sql.NullString{String: "1500.00", Valid: true},
			MaxUses:        sql.NullInt32{Int32: 500, Valid: true},
			PerUserLimit:   1,
			ExpiresAt:      sql.NullTime{Time: expires, Valid: true},
		}); err != nil {
			return err
		}
		if err := q.CreateCoupon(ctx, sqlc.CreateCouponParams{
			ID:             utils.GenerateBinaryID(),
			Code:           "FLAT500",
			Type:           sqlc.CouponsTypeFixed,
			Value:          "500.00",
			MinOrderAmount: "5000.00",
			PerUserLimit:   2,
			ExpiresAt:      sql.NullTime{Time: expires, Valid: true},
		}); err != nil {
			return err
		}
		log.Println("Created sample coupons")
	}

	promoCount, _ := q.CountAllPromotions(ctx)
	if promoCount == 0 {
		vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
		if err == nil {
			products, _ := q.ListProductsByVendor(ctx, vendor.ID)
			promoID := utils.GenerateBinaryID()
			now := time.Now()
			var createdBy *types.BinaryUUID
			if admin, adminErr := getUserByEmail(db, "admin@lumiafrica.com"); adminErr == nil {
				createdBy = &admin.ID
			}
			if err := q.CreatePromotion(ctx, sqlc.CreatePromotionParams{
				ID:            promoID,
				Name:          "Summer Flash Sale",
				Type:          sqlc.PromotionsTypeFlashSale,
				DiscountType:  sqlc.PromotionsDiscountTypePercentage,
				DiscountValue: "15.00",
				StartsAt:      now.Add(-24 * time.Hour),
				EndsAt:        now.AddDate(0, 1, 0),
				CreatedBy:     createdBy,
			}); err != nil {
				return err
			}
			for i, p := range products {
				if i >= 8 {
					break
				}
				_ = q.AddPromotionProduct(ctx, sqlc.AddPromotionProductParams{
					PromotionID: promoID, ProductID: p.ID,
				})
			}
			log.Println("Created sample promotion")
		}
	}

	collCount, _ := q.CountAllCollections(ctx)
	if collCount == 0 {
		vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
		if err == nil {
			products, _ := q.ListProductsByVendor(ctx, vendor.ID)
			collID := utils.GenerateBinaryID()
			var createdBy *types.BinaryUUID
			if admin, adminErr := getUserByEmail(db, "admin@lumiafrica.com"); adminErr == nil {
				createdBy = &admin.ID
			}
			if err := q.CreateCollection(ctx, sqlc.CreateCollectionParams{
				ID:          collID,
				Name:        "Staff Picks",
				Slug:        "staff-picks",
				Description: sql.NullString{String: "Curated favorites from the Lumi team", Valid: true},
				Image:       sql.NullString{String: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=80", Valid: true},
				SortOrder:   1,
				CreatedBy:   createdBy,
			}); err != nil {
				return err
			}
			for i, p := range products {
				if i >= 6 {
					break
				}
				_ = q.AddCollectionProduct(ctx, sqlc.AddCollectionProductParams{
					CollectionID: collID, ProductID: p.ID, SortOrder: int32(i),
				})
			}
			log.Println("Created sample collection")
		}
	}

	return nil
}
