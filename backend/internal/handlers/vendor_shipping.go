package handlers

import (
	"database/sql"
	"net/http"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

// ListVendorShippingRates godoc
// @Summary List vendor shipping rates by zone
// @Description Returns all active delivery zones with this vendor's fee for each zone.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Router /vendor/shipping-rates [get]
func ListVendorShippingRates() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}

		rates, err := q.ListVendorShippingRatesByVendor(ctx, vendor.ID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load shipping rates")
			return
		}
		rateByZone := make(map[string]float64, len(rates))
		for _, row := range rates {
			rateByZone[row.ZoneID.String()] = store.ParseDecimalString(row.Fee)
		}

		zones, err := q.ListActiveDeliveryZones(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load delivery zones")
			return
		}

		out := make([]models.VendorShippingRateResponse, len(zones))
		for i, zone := range zones {
			out[i] = models.VendorShippingRateResponse{
				ZoneID:        zone.ID.String(),
				ZoneName:      zone.Name,
				EstimatedDays: zone.EstimatedDays,
				Fee:           rateByZone[zone.ID.String()],
			}
		}

		var freeThreshold *float64
		if vendor.FreeShippingThreshold.Valid {
			v := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
			freeThreshold = &v
		}

		utils.Success(c, gin.H{
			"rates":                 out,
			"freeShippingThreshold": freeThreshold,
		})
	}
}

// UpdateVendorShippingRates godoc
// @Summary Update vendor shipping rates by zone
// @Description Set a flat shipping fee for each delivery zone. Omit or zero fee removes the zone rate.
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param rates body models.UpdateVendorShippingRatesRequest true "Zone shipping fees"
// @Success 200 {object} map[string]interface{}
// @Router /vendor/shipping-rates [put]
func UpdateVendorShippingRates() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		var req models.UpdateVendorShippingRatesRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}

		for _, rate := range req.Rates {
			zoneID, err := utils.ParseID(rate.ZoneID)
			if err != nil {
				utils.Error(c, http.StatusBadRequest, "Invalid delivery zone")
				return
			}
			if _, err := q.GetDeliveryZoneByID(ctx, zoneID); err != nil {
				utils.Error(c, http.StatusBadRequest, "Delivery zone not found")
				return
			}
			if rate.Fee <= 0 {
				_ = q.DeleteVendorShippingRate(ctx, sqlc.DeleteVendorShippingRateParams{
					VendorID: vendor.ID, ZoneID: zoneID,
				})
				continue
			}
			if err := q.UpsertVendorShippingRate(ctx, sqlc.UpsertVendorShippingRateParams{
				ID:       utils.GenerateBinaryID(),
				VendorID: vendor.ID,
				ZoneID:   zoneID,
				Fee:      store.FloatToDecimalString(rate.Fee),
			}); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to save shipping rate")
				return
			}
		}

		if req.FreeShippingThreshold != nil {
			if *req.FreeShippingThreshold < 0 {
				utils.Error(c, http.StatusBadRequest, "Free shipping threshold cannot be negative")
				return
			}
			params := sqlc.UpdateVendorProfileParams{UserID: userID}
			if *req.FreeShippingThreshold == 0 {
				params.FreeShippingThreshold = sql.NullString{String: "0.00", Valid: true}
			} else {
				params.FreeShippingThreshold = sql.NullString{
					String: store.FloatToDecimalString(*req.FreeShippingThreshold),
					Valid:  true,
				}
			}
			if err := q.UpdateVendorProfile(ctx, params); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to update free shipping threshold")
				return
			}
		}

		rates, _ := q.ListVendorShippingRatesByVendor(ctx, vendor.ID)
		rateByZone := make(map[string]float64, len(rates))
		for _, row := range rates {
			rateByZone[row.ZoneID.String()] = store.ParseDecimalString(row.Fee)
		}
		zones, err := q.ListActiveDeliveryZones(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load delivery zones")
			return
		}
		out := make([]models.VendorShippingRateResponse, len(zones))
		for i, zone := range zones {
			out[i] = models.VendorShippingRateResponse{
				ZoneID: zone.ID.String(), ZoneName: zone.Name,
				EstimatedDays: zone.EstimatedDays, Fee: rateByZone[zone.ID.String()],
			}
		}
		vendor, _ = q.GetVendorByUserID(ctx, userID)
		var freeThreshold *float64
		if vendor.FreeShippingThreshold.Valid {
			v := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
			if v > 0 {
				freeThreshold = &v
			}
		}
		utils.Success(c, gin.H{"rates": out, "freeShippingThreshold": freeThreshold})
	}
}
