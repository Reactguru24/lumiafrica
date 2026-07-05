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

func toShowcaseResponse(row sqlc.HomepageShowcase) models.HomepageShowcaseResponse {
	images := []string{}
	for _, img := range []string{row.Image1, row.Image2, row.Image3, row.Image4} {
		if strings.TrimSpace(img) != "" {
			images = append(images, img)
		}
	}
	return models.HomepageShowcaseResponse{
		ID:              row.ID.String(),
		Overline:        row.Overline,
		Headline:        row.Headline,
		Description:     row.Description,
		ButtonText:      row.ButtonText,
		ButtonLink:      row.ButtonLink,
		BackgroundColor: row.BackgroundColor,
		Images:          images,
		Active:          int16ToBool(row.Active),
	}
}

func defaultShowcaseResponse() models.HomepageShowcaseResponse {
	return models.HomepageShowcaseResponse{
		Overline:        "Made for East Africa",
		Headline:        "Fashion From Nairobi to Kampala",
		Description:     "Shop local brands and international labels from verified vendors across Kenya, Uganda, Tanzania, Rwanda, and Ethiopia.",
		ButtonText:      "Explore Trends",
		ButtonLink:      "/products?trending=true",
		BackgroundColor: "#084c54",
		Images: []string{
			"https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop&q=80",
			"https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop&q=80",
			"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=1000&fit=crop&q=80",
			"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop&q=80",
		},
		Active: true,
	}
}

func defaultHomepageContent() models.HomepageContentResponse {
	return models.HomepageContentResponse{
		HeroSlides: []models.HomepageHeroSlideResponse{
			{Label: "Men's Collection", Title: "Sharp Style for Every Occasion", Subtitle: "From Nairobi boardrooms to weekend outings — discover premium menswear across East Africa.", Image: "/images/hero-men.jpg", Link: "/products?category=men", SortOrder: 0, Active: true},
			{Label: "Women's Fashion", Title: "Elegant Looks, African Spirit", Subtitle: "Dresses, kitenge-inspired pieces, and contemporary fashion curated for the modern woman.", Image: "/images/hero-women.jpg", Link: "/products?category=women", SortOrder: 1, Active: true},
			{Label: "Kids & Teens", Title: "Growing Up in Style", Subtitle: "Comfortable, durable clothing for boys, girls, and teens — from playtime to school days.", Image: "/images/hero-kids.jpg", Link: "/products?category=kids", SortOrder: 2, Active: true},
		},
	}
}

func loadPublicHomepageContent(ctx context.Context, q *sqlc.Queries) models.HomepageContentResponse {
	defaults := defaultHomepageContent()
	out := models.HomepageContentResponse{
		HeroSlides: []models.HomepageHeroSlideResponse{},
	}

	slides, err := q.ListActiveHomepageHeroSlides(ctx)
	if err != nil || len(slides) == 0 {
		out.HeroSlides = defaults.HeroSlides
	} else {
		for _, row := range slides {
			out.HeroSlides = append(out.HeroSlides, toHeroSlideResponse(row))
		}
	}

	showcase, err := q.GetActiveHomepageShowcase(ctx)
	if err == nil {
		s := toShowcaseResponse(showcase)
		out.Showcase = &s
	} else if isMissingHomepageTable(err) || errors.Is(err, sql.ErrNoRows) {
		def := defaultShowcaseResponse()
		out.Showcase = &def
	}
	return out
}

// GetHomepageContent godoc
// @Summary Get homepage carousel and feature showcase
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

// GetAdminHomepageShowcase godoc
// @Summary Get homepage feature showcase (admin)
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} models.HomepageShowcaseResponse
// @Router /admin/homepage/showcase [get]
func GetAdminHomepageShowcase() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		row, err := getStore(c).Queries().GetHomepageShowcase(ctx)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) || isMissingHomepageTable(err) {
				utils.Success(c, defaultShowcaseResponse())
				return
			}
			utils.Error(c, http.StatusInternalServerError, "Failed to load showcase")
			return
		}
		utils.Success(c, toShowcaseResponse(row))
	}
}

func showcaseImages(req models.UpsertHomepageShowcaseRequest) [4]string {
	var out [4]string
	for i := 0; i < 4 && i < len(req.Images); i++ {
		out[i] = strings.TrimSpace(req.Images[i])
	}
	return out
}

// UpsertAdminHomepageShowcase godoc
// @Summary Create or update homepage feature showcase (admin)
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param showcase body models.UpsertHomepageShowcaseRequest true "Showcase content"
// @Success 200 {object} models.HomepageShowcaseResponse
// @Router /admin/homepage/showcase [put]
func UpsertAdminHomepageShowcase() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpsertHomepageShowcaseRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		imgs := showcaseImages(req)
		bg := strings.TrimSpace(req.BackgroundColor)
		if bg == "" {
			bg = "#084c54"
		}
		btnText := strings.TrimSpace(req.ButtonText)
		if btnText == "" {
			btnText = "Explore Trends"
		}
		btnLink := strings.TrimSpace(req.ButtonLink)
		if btnLink == "" {
			btnLink = "/products?trending=true"
		}
		overline := strings.TrimSpace(req.Overline)
		if overline == "" {
			overline = "Made for East Africa"
		}

		existing, err := q.GetHomepageShowcase(ctx)
		if err != nil && !errors.Is(err, sql.ErrNoRows) && !isMissingHomepageTable(err) {
			utils.Error(c, http.StatusInternalServerError, "Failed to save showcase")
			return
		}

		if errors.Is(err, sql.ErrNoRows) || isMissingHomepageTable(err) {
			id := utils.GenerateBinaryID()
			if err := q.CreateHomepageShowcase(ctx, sqlc.CreateHomepageShowcaseParams{
				ID:              id,
				Overline:        overline,
				Headline:        strings.TrimSpace(req.Headline),
				Description:     strings.TrimSpace(req.Description),
				ButtonText:      btnText,
				ButtonLink:      btnLink,
				BackgroundColor: bg,
				Image1:          imgs[0],
				Image2:          imgs[1],
				Image3:          imgs[2],
				Image4:          imgs[3],
				Active:          boolToInt16(req.Active),
			}); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to save showcase")
				return
			}
			row, err := q.GetHomepageShowcase(ctx)
			if err != nil {
				utils.Success(c, defaultShowcaseResponse())
				return
			}
			utils.Success(c, toShowcaseResponse(row))
			return
		}

		if err := q.UpdateHomepageShowcase(ctx, sqlc.UpdateHomepageShowcaseParams{
			Overline:        overline,
			Headline:        strings.TrimSpace(req.Headline),
			Description:     strings.TrimSpace(req.Description),
			ButtonText:      btnText,
			ButtonLink:      btnLink,
			BackgroundColor: bg,
			Image1:          imgs[0],
			Image2:          imgs[1],
			Image3:          imgs[2],
			Image4:          imgs[3],
			Active:          boolToInt16(req.Active),
			ID:              existing.ID,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to save showcase")
			return
		}
		row, err := q.GetHomepageShowcase(ctx)
		if err != nil {
			utils.Success(c, toShowcaseResponse(existing))
			return
		}
		utils.Success(c, toShowcaseResponse(row))
	}
}

func isMissingHomepageTable(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "doesn't exist") || errors.Is(err, sql.ErrNoRows)
}
