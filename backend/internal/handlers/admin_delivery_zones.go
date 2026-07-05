package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func platformDeliveryZoneResponse(zone sqlc.DeliveryZone) models.DeliveryZoneResponse {
	return store.ToDeliveryZone(zone)
}

// ListAdminDeliveryZones godoc
// @Summary List platform delivery zones (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {array} models.DeliveryZoneResponse
// @Router /admin/delivery-zones [get]
func ListAdminDeliveryZones() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListPlatformDeliveryZones(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load delivery zones")
			return
		}
		out := make([]models.DeliveryZoneResponse, len(rows))
		for i, row := range rows {
			out[i] = platformDeliveryZoneResponse(row)
		}
		utils.Success(c, out)
	}
}

// CreateAdminDeliveryZone godoc
// @Summary Create a platform delivery zone (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param zone body models.CreateDeliveryZoneRequest true "Zone details"
// @Success 201 {object} models.DeliveryZoneResponse
// @Router /admin/delivery-zones [post]
func CreateAdminDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateDeliveryZoneRequest
		if !bindJSON(c, &req) {
			return
		}
		name := strings.TrimSpace(req.Name)
		if name == "" {
			utils.Error(c, http.StatusBadRequest, "Zone name is required")
			return
		}
		estimated := strings.TrimSpace(req.EstimatedDays)
		if estimated == "" {
			utils.Error(c, http.StatusBadRequest, "Estimated delivery window is required")
			return
		}
		if req.BaseCost < 0 {
			utils.Error(c, http.StatusBadRequest, "Shipping fee cannot be negative")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		zoneID := utils.GenerateBinaryID()
		if err := q.CreateDeliveryZone(ctx, sqlc.CreateDeliveryZoneParams{
			ID:            zoneID,
			VendorID:      nil,
			Name:          name,
			BaseCost:      store.FloatToDecimalString(req.BaseCost),
			EstimatedDays: estimated,
		}); err != nil {
			utils.Error(c, http.StatusBadRequest, "A zone with this name already exists")
			return
		}

		city := strings.TrimSpace(req.CityName)
		if city == "" {
			city = strings.TrimSuffix(name, " Metro")
			city = strings.TrimSpace(city)
		}
		if city != "" {
			_ = q.CreateDeliveryZoneArea(ctx, sqlc.CreateDeliveryZoneAreaParams{
				ID:       utils.GenerateBinaryID(),
				ZoneID:   zoneID,
				AreaType: sqlc.DeliveryZoneAreasAreaTypeCity,
				AreaName: city,
			})
		}

		row, err := q.GetPlatformDeliveryZoneByID(ctx, zoneID)
		if err != nil {
			utils.SuccessCreated(c, models.DeliveryZoneResponse{
				ID:            zoneID.String(),
				Name:          name,
				BaseCost:      req.BaseCost,
				EstimatedDays: estimated,
				Active:        true,
			})
			return
		}
		utils.SuccessCreated(c, platformDeliveryZoneResponse(row))
	}
}

// UpdateAdminDeliveryZone godoc
// @Summary Update a platform delivery zone (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param zoneID path string true "Zone ID"
// @Param zone body models.UpdateVendorDeliveryZoneRequest true "Zone details"
// @Success 200 {object} models.DeliveryZoneResponse
// @Router /admin/delivery-zones/{zoneID} [put]
func UpdateAdminDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		zoneID, ok := parsePathID(c, "zoneID")
		if !ok {
			return
		}
		var req models.UpdateVendorDeliveryZoneRequest
		if !bindJSON(c, &req) {
			return
		}
		name := strings.TrimSpace(req.Name)
		if name == "" {
			utils.Error(c, http.StatusBadRequest, "Zone name is required")
			return
		}
		estimated := strings.TrimSpace(req.EstimatedDays)
		if estimated == "" {
			utils.Error(c, http.StatusBadRequest, "Estimated delivery window is required")
			return
		}
		if req.Fee < 0 {
			utils.Error(c, http.StatusBadRequest, "Shipping fee cannot be negative")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetPlatformDeliveryZoneByID(ctx, zoneID); err != nil {
			utils.Error(c, http.StatusNotFound, "Delivery zone not found")
			return
		}

		if err := q.UpdatePlatformDeliveryZone(ctx, sqlc.UpdatePlatformDeliveryZoneParams{
			Name:          name,
			BaseCost:      store.FloatToDecimalString(req.Fee),
			EstimatedDays: estimated,
			ID:            zoneID,
		}); err != nil {
			utils.Error(c, http.StatusBadRequest, "Unable to update delivery zone")
			return
		}

		row, _ := q.GetPlatformDeliveryZoneByID(ctx, zoneID)
		utils.Success(c, platformDeliveryZoneResponse(row))
	}
}

// DeleteAdminDeliveryZone godoc
// @Summary Deactivate a platform delivery zone (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param zoneID path string true "Zone ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/delivery-zones/{zoneID} [delete]
func DeleteAdminDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		zoneID, ok := parsePathID(c, "zoneID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.SetPlatformDeliveryZoneActive(ctx, sqlc.SetPlatformDeliveryZoneActiveParams{
			Active: 0, ID: zoneID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to remove delivery zone")
			return
		}
		utils.Success(c, gin.H{"removed": true})
	}
}

// UpdateVendorFreeShipping godoc
// @Summary Update free-shipping threshold
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param body body models.UpdateVendorFreeShippingRequest true "Threshold"
// @Success 200 {object} map[string]interface{}
// @Router /vendor/shipping-rates [put]
func UpdateVendorFreeShipping() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		var req models.UpdateVendorFreeShippingRequest
		if !bindJSON(c, &req) {
			return
		}
		if req.FreeShippingThreshold != nil && *req.FreeShippingThreshold < 0 {
			utils.Error(c, http.StatusBadRequest, "Free shipping threshold cannot be negative")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}

		if req.FreeShippingThreshold != nil {
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

		vendor, _ = q.GetVendorByUserID(ctx, userID)
		var freeThreshold *float64
		if vendor.FreeShippingThreshold.Valid {
			v := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
			if v > 0 {
				freeThreshold = &v
			}
		}
		utils.Success(c, gin.H{"freeShippingThreshold": freeThreshold})
	}
}
