package handlers

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

func boolToInt16(v bool) int16 {
	if v {
		return 1
	}
	return 0
}

func int16ToBool(v int16) bool {
	return v != 0
}

func nullString(s string) sql.NullString {
	s = strings.TrimSpace(s)
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func nullStringPtr(s sql.NullString) string {
	if !s.Valid {
		return ""
	}
	return s.String
}

func toHeroSlideResponse(row sqlc.HomepageHeroSlide) models.HomepageHeroSlideResponse {
	return models.HomepageHeroSlideResponse{
		ID:        row.ID.String(),
		Label:     row.Label,
		Title:     row.Title,
		Subtitle:  nullStringPtr(row.Subtitle),
		Image:     row.Image,
		Link:      row.Link,
		SortOrder: int(row.SortOrder),
		Active:    int16ToBool(row.Active),
	}
}

func toPromoItemResponse(row sqlc.HomepagePromoItem) models.HomepagePromoItemResponse {
	return models.HomepagePromoItemResponse{
		ID:          row.ID.String(),
		Title:       row.Title,
		Description: row.Description,
		Icon:        row.Icon,
		SortOrder:   int(row.SortOrder),
		Active:      int16ToBool(row.Active),
	}
}

func toBannerResponse(row sqlc.HomepageBanner) models.HomepageBannerResponse {
	return models.HomepageBannerResponse{
		ID:        row.ID.String(),
		Title:     nullStringPtr(row.Title),
		Subtitle:  nullStringPtr(row.Subtitle),
		Image:     row.Image,
		Link:      nullStringPtr(row.Link),
		Active:    int16ToBool(row.Active),
		SortOrder: int(row.SortOrder),
	}
}

func defaultHomepageContent() models.HomepageContentResponse {
	return models.HomepageContentResponse{
		HeroSlides: []models.HomepageHeroSlideResponse{
			{Label: "Men's Collection", Title: "Sharp Style for Every Occasion", Subtitle: "From Nairobi boardrooms to weekend outings — discover premium menswear across East Africa.", Image: "/images/hero-men.jpg", Link: "/products?category=men", SortOrder: 0, Active: true},
			{Label: "Women's Fashion", Title: "Elegant Looks, African Spirit", Subtitle: "Dresses, kitenge-inspired pieces, and contemporary fashion curated for the modern woman.", Image: "/images/hero-women.jpg", Link: "/products?category=women", SortOrder: 1, Active: true},
			{Label: "Kids & Teens", Title: "Growing Up in Style", Subtitle: "Comfortable, durable clothing for boys, girls, and teens — from playtime to school days.", Image: "/images/hero-kids.jpg", Link: "/products?category=kids", SortOrder: 2, Active: true},
		},
		PromoItems: []models.HomepagePromoItemResponse{
			{Title: "Fast Shipping", Description: "Reliable delivery across East Africa", Icon: "🚚", SortOrder: 0, Active: true},
			{Title: "M-Pesa & Cards", Description: "Pay your way, securely", Icon: "📱", SortOrder: 1, Active: true},
			{Title: "Easy Returns", Description: "14-day return policy", Icon: "↩️", SortOrder: 2, Active: true},
			{Title: "Verified Vendors", Description: "Trusted East African sellers", Icon: "✓", SortOrder: 3, Active: true},
		},
	}
}

func loadPublicHomepageContent(ctx context.Context, q *sqlc.Queries) models.HomepageContentResponse {
	defaults := defaultHomepageContent()
	out := models.HomepageContentResponse{
		HeroSlides: []models.HomepageHeroSlideResponse{},
		PromoItems: []models.HomepagePromoItemResponse{},
	}

	slides, err := q.ListActiveHomepageHeroSlides(ctx)
	if err != nil || len(slides) == 0 {
		out.HeroSlides = defaults.HeroSlides
	} else {
		for _, row := range slides {
			out.HeroSlides = append(out.HeroSlides, toHeroSlideResponse(row))
		}
	}

	promos, err := q.ListActiveHomepagePromoItems(ctx)
	if err != nil || len(promos) == 0 {
		out.PromoItems = defaults.PromoItems
	} else {
		for _, row := range promos {
			out.PromoItems = append(out.PromoItems, toPromoItemResponse(row))
		}
	}

	banners, err := q.ListActiveHomepageBanners(ctx)
	if err == nil && len(banners) > 0 {
		b := toBannerResponse(banners[0])
		out.Banner = &b
	}
	return out
}

// GetHomepageContent godoc
// @Summary Get homepage carousel, promo strip, and banner
// @Description Returns active homepage marketing content managed by admins.
// @Tags Guest
// @Produce json
// @Success 200 {object} models.HomepageContentResponse
// @Router /homepage [get]
func GetHomepageContent() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		utils.Success(c, loadPublicHomepageContent(ctx, q))
	}
}

// ListAdminHomepageHeroSlides godoc
// @Summary List hero carousel slides (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {array} models.HomepageHeroSlideResponse
// @Router /admin/homepage/hero-slides [get]
func ListAdminHomepageHeroSlides() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListAllHomepageHeroSlides(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load hero slides")
			return
		}
		out := make([]models.HomepageHeroSlideResponse, len(rows))
		for i, row := range rows {
			out[i] = toHeroSlideResponse(row)
		}
		utils.Success(c, out)
	}
}

// CreateAdminHomepageHeroSlide godoc
// @Summary Create hero carousel slide (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param slide body models.CreateHomepageHeroSlideRequest true "Slide details"
// @Success 201 {object} models.HomepageHeroSlideResponse
// @Router /admin/homepage/hero-slides [post]
func CreateAdminHomepageHeroSlide() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateHomepageHeroSlideRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		id := utils.GenerateBinaryID()
		link := strings.TrimSpace(req.Link)
		if link == "" {
			link = "/products"
		}
		if err := q.CreateHomepageHeroSlide(ctx, sqlc.CreateHomepageHeroSlideParams{
			ID:        id,
			Label:     strings.TrimSpace(req.Label),
			Title:     strings.TrimSpace(req.Title),
			Subtitle:  nullString(req.Subtitle),
			Image:     strings.TrimSpace(req.Image),
			Link:      link,
			SortOrder: int32(req.SortOrder),
			Active:    1,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create hero slide")
			return
		}
		row, err := q.GetHomepageHeroSlideByID(ctx, id)
		if err != nil {
			utils.SuccessCreated(c, gin.H{"id": id.String()})
			return
		}
		utils.SuccessCreated(c, toHeroSlideResponse(row))
	}
}

// UpdateAdminHomepageHeroSlide godoc
// @Summary Update hero carousel slide (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param slideID path string true "Slide ID"
// @Param slide body models.UpdateHomepageHeroSlideRequest true "Slide updates"
// @Success 200 {object} models.HomepageHeroSlideResponse
// @Router /admin/homepage/hero-slides/{slideID} [put]
func UpdateAdminHomepageHeroSlide() gin.HandlerFunc {
	return func(c *gin.Context) {
		slideID, ok := parsePathID(c, "slideID")
		if !ok {
			return
		}
		var req models.UpdateHomepageHeroSlideRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		link := strings.TrimSpace(req.Link)
		if link == "" {
			link = "/products"
		}
		if err := q.UpdateHomepageHeroSlide(ctx, sqlc.UpdateHomepageHeroSlideParams{
			ID:        slideID,
			Label:     strings.TrimSpace(req.Label),
			Title:     strings.TrimSpace(req.Title),
			Subtitle:  nullString(req.Subtitle),
			Image:     strings.TrimSpace(req.Image),
			Link:      link,
			SortOrder: int32(req.SortOrder),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update hero slide")
			return
		}
		row, err := q.GetHomepageHeroSlideByID(ctx, slideID)
		if handleNotFound(c, err, "Slide not found", "Failed to load slide") {
			return
		}
		utils.Success(c, toHeroSlideResponse(row))
	}
}

// SetAdminHomepageHeroSlideActive godoc
// @Summary Enable or disable hero slide (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param slideID path string true "Slide ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/homepage/hero-slides/{slideID}/active [put]
func SetAdminHomepageHeroSlideActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		setAdminActive(c, "slideID", "Failed to update hero slide", func(ctx context.Context, id types.BinaryUUID, active int16) error {
			return getStore(c).Queries().SetHomepageHeroSlideActive(ctx, sqlc.SetHomepageHeroSlideActiveParams{ID: id, Active: active})
		})
	}
}

// DeleteAdminHomepageHeroSlide godoc
// @Summary Delete hero slide (admin)
// @Tags Admin
// @Security Bearer
// @Param slideID path string true "Slide ID"
// @Success 204
// @Router /admin/homepage/hero-slides/{slideID} [delete]
func DeleteAdminHomepageHeroSlide() gin.HandlerFunc {
	return func(c *gin.Context) {
		slideID, ok := parsePathID(c, "slideID")
		if !ok {
			return
		}
		if err := getStore(c).Queries().DeleteHomepageHeroSlide(c.Request.Context(), slideID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete hero slide")
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// ListAdminHomepagePromoItems godoc
// @Summary List promo strip items (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {array} models.HomepagePromoItemResponse
// @Router /admin/homepage/promo-items [get]
func ListAdminHomepagePromoItems() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListAllHomepagePromoItems(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load promo items")
			return
		}
		out := make([]models.HomepagePromoItemResponse, len(rows))
		for i, row := range rows {
			out[i] = toPromoItemResponse(row)
		}
		utils.Success(c, out)
	}
}

// CreateAdminHomepagePromoItem godoc
// @Summary Create promo strip item (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param item body models.CreateHomepagePromoItemRequest true "Promo item"
// @Success 201 {object} models.HomepagePromoItemResponse
// @Router /admin/homepage/promo-items [post]
func CreateAdminHomepagePromoItem() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateHomepagePromoItemRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		id := utils.GenerateBinaryID()
		icon := strings.TrimSpace(req.Icon)
		if icon == "" {
			icon = "✓"
		}
		if err := q.CreateHomepagePromoItem(ctx, sqlc.CreateHomepagePromoItemParams{
			ID:          id,
			Title:       strings.TrimSpace(req.Title),
			Description: strings.TrimSpace(req.Description),
			Icon:        icon,
			SortOrder:   int32(req.SortOrder),
			Active:      1,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create promo item")
			return
		}
		row, err := q.GetHomepagePromoItemByID(ctx, id)
		if err != nil {
			utils.SuccessCreated(c, gin.H{"id": id.String()})
			return
		}
		utils.SuccessCreated(c, toPromoItemResponse(row))
	}
}

// UpdateAdminHomepagePromoItem godoc
// @Summary Update promo strip item (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param itemID path string true "Promo item ID"
// @Param item body models.UpdateHomepagePromoItemRequest true "Promo item updates"
// @Success 200 {object} models.HomepagePromoItemResponse
// @Router /admin/homepage/promo-items/{itemID} [put]
func UpdateAdminHomepagePromoItem() gin.HandlerFunc {
	return func(c *gin.Context) {
		itemID, ok := parsePathID(c, "itemID")
		if !ok {
			return
		}
		var req models.UpdateHomepagePromoItemRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		icon := strings.TrimSpace(req.Icon)
		if icon == "" {
			icon = "✓"
		}
		if err := q.UpdateHomepagePromoItem(ctx, sqlc.UpdateHomepagePromoItemParams{
			ID:          itemID,
			Title:       strings.TrimSpace(req.Title),
			Description: strings.TrimSpace(req.Description),
			Icon:        icon,
			SortOrder:   int32(req.SortOrder),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update promo item")
			return
		}
		row, err := q.GetHomepagePromoItemByID(ctx, itemID)
		if handleNotFound(c, err, "Promo item not found", "Failed to load promo item") {
			return
		}
		utils.Success(c, toPromoItemResponse(row))
	}
}

// SetAdminHomepagePromoItemActive godoc
// @Summary Enable or disable promo item (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param itemID path string true "Promo item ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/homepage/promo-items/{itemID}/active [put]
func SetAdminHomepagePromoItemActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		setAdminActive(c, "itemID", "Failed to update promo item", func(ctx context.Context, id types.BinaryUUID, active int16) error {
			return getStore(c).Queries().SetHomepagePromoItemActive(ctx, sqlc.SetHomepagePromoItemActiveParams{ID: id, Active: active})
		})
	}
}

// DeleteAdminHomepagePromoItem godoc
// @Summary Delete promo item (admin)
// @Tags Admin
// @Security Bearer
// @Param itemID path string true "Promo item ID"
// @Success 204
// @Router /admin/homepage/promo-items/{itemID} [delete]
func DeleteAdminHomepagePromoItem() gin.HandlerFunc {
	return func(c *gin.Context) {
		itemID, ok := parsePathID(c, "itemID")
		if !ok {
			return
		}
		if err := getStore(c).Queries().DeleteHomepagePromoItem(c.Request.Context(), itemID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete promo item")
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// ListAdminHomepageBanners godoc
// @Summary List homepage banners (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {array} models.HomepageBannerResponse
// @Router /admin/homepage/banners [get]
func ListAdminHomepageBanners() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListAllHomepageBanners(ctx)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load banners")
			return
		}
		out := make([]models.HomepageBannerResponse, len(rows))
		for i, row := range rows {
			out[i] = toBannerResponse(row)
		}
		utils.Success(c, out)
	}
}

// CreateAdminHomepageBanner godoc
// @Summary Create homepage banner (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param banner body models.CreateHomepageBannerRequest true "Banner details"
// @Success 201 {object} models.HomepageBannerResponse
// @Router /admin/homepage/banners [post]
func CreateAdminHomepageBanner() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateHomepageBannerRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		id := utils.GenerateBinaryID()
		if err := q.CreateHomepageBanner(ctx, sqlc.CreateHomepageBannerParams{
			ID:        id,
			Title:     nullString(req.Title),
			Subtitle:  nullString(req.Subtitle),
			Image:     strings.TrimSpace(req.Image),
			Link:      nullString(req.Link),
			Active:    boolToInt16(req.Active),
			SortOrder: int32(req.SortOrder),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create banner")
			return
		}
		row, err := q.GetHomepageBannerByID(ctx, id)
		if err != nil {
			utils.SuccessCreated(c, gin.H{"id": id.String()})
			return
		}
		utils.SuccessCreated(c, toBannerResponse(row))
	}
}

// UpdateAdminHomepageBanner godoc
// @Summary Update homepage banner (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param bannerID path string true "Banner ID"
// @Param banner body models.UpdateHomepageBannerRequest true "Banner updates"
// @Success 200 {object} models.HomepageBannerResponse
// @Router /admin/homepage/banners/{bannerID} [put]
func UpdateAdminHomepageBanner() gin.HandlerFunc {
	return func(c *gin.Context) {
		bannerID, ok := parsePathID(c, "bannerID")
		if !ok {
			return
		}
		var req models.UpdateHomepageBannerRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := q.UpdateHomepageBanner(ctx, sqlc.UpdateHomepageBannerParams{
			ID:        bannerID,
			Title:     nullString(req.Title),
			Subtitle:  nullString(req.Subtitle),
			Image:     strings.TrimSpace(req.Image),
			Link:      nullString(req.Link),
			SortOrder: int32(req.SortOrder),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update banner")
			return
		}
		row, err := q.GetHomepageBannerByID(ctx, bannerID)
		if handleNotFound(c, err, "Banner not found", "Failed to load banner") {
			return
		}
		utils.Success(c, toBannerResponse(row))
	}
}

// SetAdminHomepageBannerActive godoc
// @Summary Enable or disable homepage banner (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param bannerID path string true "Banner ID"
// @Param active body models.SetActiveRequest true "Active flag"
// @Success 200 {object} map[string]interface{}
// @Router /admin/homepage/banners/{bannerID}/active [put]
func SetAdminHomepageBannerActive() gin.HandlerFunc {
	return func(c *gin.Context) {
		bannerID, ok := parsePathID(c, "bannerID")
		if !ok {
			return
		}
		var req models.SetActiveRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if req.Active {
			rows, err := q.ListAllHomepageBanners(ctx)
			if err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to update banner")
				return
			}
			for _, row := range rows {
				if row.ID == bannerID {
					continue
				}
				if int16ToBool(row.Active) {
					_ = q.SetHomepageBannerActive(ctx, sqlc.SetHomepageBannerActiveParams{ID: row.ID, Active: 0})
				}
			}
		}
		if err := q.SetHomepageBannerActive(ctx, sqlc.SetHomepageBannerActiveParams{
			ID:     bannerID,
			Active: boolToInt16(req.Active),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update banner")
			return
		}
		utils.Success(c, gin.H{"active": req.Active})
	}
}

// DeleteAdminHomepageBanner godoc
// @Summary Delete homepage banner (admin)
// @Tags Admin
// @Security Bearer
// @Param bannerID path string true "Banner ID"
// @Success 204
// @Router /admin/homepage/banners/{bannerID} [delete]
func DeleteAdminHomepageBanner() gin.HandlerFunc {
	return func(c *gin.Context) {
		bannerID, ok := parsePathID(c, "bannerID")
		if !ok {
			return
		}
		if err := getStore(c).Queries().DeleteHomepageBanner(c.Request.Context(), bannerID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete banner")
			return
		}
		c.Status(http.StatusNoContent)
	}
}

func isMissingHomepageTable(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "doesn't exist") || errors.Is(err, sql.ErrNoRows)
}
