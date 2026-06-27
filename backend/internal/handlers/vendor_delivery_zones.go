package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func vendorDeliveryZoneResponse(zone sqlc.DeliveryZone, fee float64) models.VendorDeliveryZoneResponse {
	return models.VendorDeliveryZoneResponse{
		ID:            zone.ID.String(),
		Name:          zone.Name,
		EstimatedDays: zone.EstimatedDays,
		Fee:           fee,
	}
}

func vendorIDPtr(id types.BinaryUUID) *types.BinaryUUID {
	return &id
}

func listVendorDeliveryZoneResponses(ctx context.Context, q *sqlc.Queries, vendor sqlc.Vendor) ([]models.VendorDeliveryZoneResponse, error) {
	zones, err := q.ListDeliveryZonesByVendor(ctx, vendorIDPtr(vendor.ID))
	if err != nil {
		return nil, err
	}
	rates, err := q.ListVendorShippingRatesByVendor(ctx, vendor.ID)
	if err != nil {
		return nil, err
	}
	feeByZone := make(map[string]float64, len(rates))
	for _, row := range rates {
		feeByZone[row.ZoneID.String()] = store.ParseDecimalString(row.Fee)
	}
	out := make([]models.VendorDeliveryZoneResponse, len(zones))
	for i, zone := range zones {
		fee := feeByZone[zone.ID.String()]
		if fee <= 0 {
			fee = store.ParseDecimalString(zone.BaseCost)
		}
		out[i] = vendorDeliveryZoneResponse(zone, fee)
	}
	return out, nil
}

// ListVendorDeliveryZones godoc
// @Summary List vendor delivery zones
// @Description Returns this vendor's delivery regions and shipping fees.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Router /vendor/delivery-zones [get]
func ListVendorDeliveryZones() gin.HandlerFunc {
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

		zones, err := listVendorDeliveryZoneResponses(ctx, q, vendor)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load delivery zones")
			return
		}

		var freeThreshold *float64
		if vendor.FreeShippingThreshold.Valid {
			v := store.ParseDecimalString(vendor.FreeShippingThreshold.String)
			if v > 0 {
				freeThreshold = &v
			}
		}

		utils.Success(c, gin.H{
			"zones":                 zones,
			"freeShippingThreshold": freeThreshold,
		})
	}
}

// CreateVendorDeliveryZone godoc
// @Summary Create a delivery zone
// @Description Adds a delivery region with a shipping fee for this vendor's orders.
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param zone body models.CreateDeliveryZoneRequest true "Zone details"
// @Success 201 {object} models.VendorDeliveryZoneResponse
// @Router /vendor/delivery-zones [post]
func CreateVendorDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
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
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}

		zoneID := utils.GenerateBinaryID()
		vendorID := vendor.ID
		if err := q.CreateDeliveryZone(ctx, sqlc.CreateDeliveryZoneParams{
			ID:            zoneID,
			VendorID:      &vendorID,
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

		if req.BaseCost > 0 {
			_ = q.UpsertVendorShippingRate(ctx, sqlc.UpsertVendorShippingRateParams{
				ID:       utils.GenerateBinaryID(),
				VendorID: vendor.ID,
				ZoneID:   zoneID,
				Fee:      store.FloatToDecimalString(req.BaseCost),
			})
		}

		row, err := q.GetVendorDeliveryZoneByID(ctx, sqlc.GetVendorDeliveryZoneByIDParams{
			ID: zoneID, VendorID: vendorIDPtr(vendor.ID),
		})
		if err != nil {
			utils.SuccessCreated(c, vendorDeliveryZoneResponse(sqlc.DeliveryZone{
				ID: zoneID, Name: name, EstimatedDays: estimated, BaseCost: store.FloatToDecimalString(req.BaseCost),
			}, req.BaseCost))
			return
		}
		utils.SuccessCreated(c, vendorDeliveryZoneResponse(row, req.BaseCost))
	}
}

// UpdateVendorDeliveryZone godoc
// @Summary Update a delivery zone
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param zoneID path string true "Zone ID"
// @Param zone body models.UpdateVendorDeliveryZoneRequest true "Zone details"
// @Success 200 {object} models.VendorDeliveryZoneResponse
// @Router /vendor/delivery-zones/{zoneID} [put]
func UpdateVendorDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
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
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}
		if _, err := q.GetVendorDeliveryZoneByID(ctx, sqlc.GetVendorDeliveryZoneByIDParams{
			ID: zoneID, VendorID: vendorIDPtr(vendor.ID),
		}); err != nil {
			utils.Error(c, http.StatusNotFound, "Delivery zone not found")
			return
		}

		if err := q.UpdateDeliveryZone(ctx, sqlc.UpdateDeliveryZoneParams{
			Name:          name,
			BaseCost:      store.FloatToDecimalString(req.Fee),
			EstimatedDays: estimated,
			ID:            zoneID,
			VendorID:      vendorIDPtr(vendor.ID),
		}); err != nil {
			utils.Error(c, http.StatusBadRequest, "Unable to update delivery zone")
			return
		}

		if req.Fee <= 0 {
			_ = q.SoftDeleteVendorShippingRate(ctx, sqlc.SoftDeleteVendorShippingRateParams{
				VendorID: vendor.ID, ZoneID: zoneID,
			})
		} else {
			_ = q.UpsertVendorShippingRate(ctx, sqlc.UpsertVendorShippingRateParams{
				ID:       utils.GenerateBinaryID(),
				VendorID: vendor.ID,
				ZoneID:   zoneID,
				Fee:      store.FloatToDecimalString(req.Fee),
			})
		}

		row, _ := q.GetVendorDeliveryZoneByID(ctx, sqlc.GetVendorDeliveryZoneByIDParams{
			ID: zoneID, VendorID: vendorIDPtr(vendor.ID),
		})
		utils.Success(c, vendorDeliveryZoneResponse(row, req.Fee))
	}
}

// DeleteVendorDeliveryZone godoc
// @Summary Remove a delivery zone
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param zoneID path string true "Zone ID"
// @Success 200 {object} map[string]interface{}
// @Router /vendor/delivery-zones/{zoneID} [delete]
func DeleteVendorDeliveryZone() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		zoneID, ok := parsePathID(c, "zoneID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		vendor, err := q.GetVendorByUserID(ctx, userID)
		if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
			return
		}
		if err := q.SetDeliveryZoneActive(ctx, sqlc.SetDeliveryZoneActiveParams{
			Active: 0, ID: zoneID, VendorID: vendorIDPtr(vendor.ID),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to remove delivery zone")
			return
		}
		_ = q.SoftDeleteVendorShippingRate(ctx, sqlc.SoftDeleteVendorShippingRateParams{
			VendorID: vendor.ID, ZoneID: zoneID,
		})
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
