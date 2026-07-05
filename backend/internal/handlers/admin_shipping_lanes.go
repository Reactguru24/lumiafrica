package handlers

import (
	"net/http"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/commerce"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func toShippingLaneRateResponse(row sqlc.ShippingLaneRate) models.ShippingLaneRateResponse {
	return models.ShippingLaneRateResponse{
		ID:              row.ID.String(),
		OriginCity:      row.OriginCity,
		DestinationCity: row.DestinationCity,
		Fee:             store.ParseDecimalString(row.Fee),
		EstimatedDays:   row.EstimatedDays,
		Active:          row.Active != 0,
	}
}

// ListAdminShippingLanes godoc
// @Summary List shipping lane rates (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {array} models.ShippingLaneRateResponse
// @Router /admin/shipping-lanes [get]
func ListAdminShippingLanes() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListAllShippingLaneRates(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load shipping lanes")
			return
		}
		out := make([]models.ShippingLaneRateResponse, len(rows))
		for i, row := range rows {
			out[i] = toShippingLaneRateResponse(row)
		}
		utils.Success(c, out)
	}
}

// CreateAdminShippingLane godoc
// @Summary Create a shipping lane rate (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param lane body models.CreateShippingLaneRateRequest true "Lane details"
// @Success 201 {object} models.ShippingLaneRateResponse
// @Router /admin/shipping-lanes [post]
func CreateAdminShippingLane() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateShippingLaneRateRequest
		if !bindJSON(c, &req) {
			return
		}
		origin := commerce.DisplayCity(req.OriginCity)
		dest := commerce.DisplayCity(req.DestinationCity)
		if origin == "Unknown" || dest == "Unknown" {
			utils.Error(c, http.StatusBadRequest, "Origin and destination cities are required")
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
		laneID := utils.GenerateBinaryID()
		if err := q.CreateShippingLaneRate(ctx, sqlc.CreateShippingLaneRateParams{
			ID:              laneID,
			OriginCity:      origin,
			DestinationCity: dest,
			Fee:             store.FloatToDecimalString(req.Fee),
			EstimatedDays:   estimated,
		}); err != nil {
			utils.Error(c, http.StatusBadRequest, "A lane for this route already exists")
			return
		}

		row, err := q.GetShippingLaneRateByID(ctx, laneID)
		if err != nil {
			utils.SuccessCreated(c, models.ShippingLaneRateResponse{
				ID:              laneID.String(),
				OriginCity:      origin,
				DestinationCity: dest,
				Fee:             req.Fee,
				EstimatedDays:   estimated,
				Active:          true,
			})
			return
		}
		utils.SuccessCreated(c, toShippingLaneRateResponse(row))
	}
}

// UpdateAdminShippingLane godoc
// @Summary Update a shipping lane rate (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param laneID path string true "Lane ID"
// @Param lane body models.UpdateShippingLaneRateRequest true "Lane details"
// @Success 200 {object} models.ShippingLaneRateResponse
// @Router /admin/shipping-lanes/{laneID} [put]
func UpdateAdminShippingLane() gin.HandlerFunc {
	return func(c *gin.Context) {
		laneID, ok := parsePathID(c, "laneID")
		if !ok {
			return
		}
		var req models.UpdateShippingLaneRateRequest
		if !bindJSON(c, &req) {
			return
		}
		origin := commerce.DisplayCity(req.OriginCity)
		dest := commerce.DisplayCity(req.DestinationCity)
		if origin == "Unknown" || dest == "Unknown" {
			utils.Error(c, http.StatusBadRequest, "Origin and destination cities are required")
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
		if _, err := q.GetShippingLaneRateByID(ctx, laneID); err != nil {
			utils.Error(c, http.StatusNotFound, "Shipping lane not found")
			return
		}

		if err := q.UpdateShippingLaneRate(ctx, sqlc.UpdateShippingLaneRateParams{
			OriginCity:      origin,
			DestinationCity: dest,
			Fee:             store.FloatToDecimalString(req.Fee),
			EstimatedDays:   estimated,
			ID:              laneID,
		}); err != nil {
			utils.Error(c, http.StatusBadRequest, "Unable to update shipping lane")
			return
		}

		row, _ := q.GetShippingLaneRateByID(ctx, laneID)
		utils.Success(c, toShippingLaneRateResponse(row))
	}
}

// DeleteAdminShippingLane godoc
// @Summary Deactivate a shipping lane rate (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param laneID path string true "Lane ID"
// @Success 200 {object} map[string]interface{}
// @Router /admin/shipping-lanes/{laneID} [delete]
func DeleteAdminShippingLane() gin.HandlerFunc {
	return func(c *gin.Context) {
		laneID, ok := parsePathID(c, "laneID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.SetShippingLaneRateActive(ctx, sqlc.SetShippingLaneRateActiveParams{
			Active: 0, ID: laneID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to remove shipping lane")
			return
		}
		utils.Success(c, gin.H{"removed": true})
	}
}
