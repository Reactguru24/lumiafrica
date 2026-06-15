package handlers

import (
	"context"
	"database/sql"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CreateReview godoc
// @Summary Create a product review
// @Description Customer creates a review for a purchased product
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param review body models.CreateReviewRequest true "Review details"
// @Success 201 {object} map[string]interface{}
// @Router /reviews [post]
func CreateReview() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		var req models.CreateReviewRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		product, err := q.GetProductByID(ctx, req.ProductID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if _, err := q.GetOrderByIDAndUser(ctx, sqlc.GetOrderByIDAndUserParams{ID: req.OrderID, UserID: userID}); err != nil {
			utils.Error(c, http.StatusForbidden, "Order not found or unauthorized")
			return
		}
		if _, err := q.GetReviewByProductAndUser(ctx, sqlc.GetReviewByProductAndUserParams{
			ProductID: req.ProductID, UserID: userID,
		}); err == nil {
			utils.Error(c, http.StatusBadRequest, "You have already reviewed this product")
			return
		}

		reviewID := utils.GenerateID()
		if err := q.CreateReview(ctx, sqlc.CreateReviewParams{
			ID: reviewID, ProductID: req.ProductID, VendorID: product.VendorID,
			UserID: userID, OrderID: req.OrderID, Rating: int32(req.Rating), Comment: req.Comment,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create review")
			return
		}

		updateProductRating(ctx, q, req.ProductID)
		utils.SuccessCreated(c, gin.H{"id": reviewID})
	}
}

// GetProductReviews godoc
// @Summary Get product reviews
// @Description Get all reviews for a specific product
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Review}
// @Router /reviews/product/{productID} [get]
func GetProductReviews() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Param("productID")
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if _, err := q.GetProductByID(ctx, productID); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		page, limit, offset := pagination(c, 1, 10)
		total, err := q.CountReviewsByProduct(ctx, productID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch reviews")
			return
		}
		rows, err := q.ListReviewsByProduct(ctx, sqlc.ListReviewsByProductParams{
			ProductID: productID, Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch reviews")
			return
		}
		respondPaginated(c, store.ToReviews(rows), total, page, limit)
	}
}

// GetVendorReviews godoc
// @Summary List vendor reviews
// @Description Vendor lists all reviews on their products
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Review}
// @Router /vendor/reviews [get]
func GetVendorReviews() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		page, limit, offset := pagination(c, 1, 10)

		productIDs, err := q.ListProductIDsByVendor(ctx, vendorID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch reviews")
			return
		}
		if len(productIDs) == 0 {
			respondPaginated(c, []models.Review{}, 0, page, limit)
			return
		}

		total, err := q.CountReviewsByProductIDs(ctx, productIDs)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch reviews")
			return
		}
		rows, err := q.ListReviewsByProductIDs(ctx, sqlc.ListReviewsByProductIDsParams{
			ProductIds: productIDs, Limit: int32(limit), Offset: int32(offset),
		})
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch reviews")
			return
		}
		respondPaginated(c, enrichReviewsWithProducts(ctx, q, store.ToReviews(rows)), total, page, limit)
	}
}

func enrichReviewsWithProducts(ctx context.Context, q *sqlc.Queries, reviews []models.Review) []models.Review {
	if len(reviews) == 0 {
		return reviews
	}
	cache := make(map[string]sqlc.Product)
	for i := range reviews {
		pid := reviews[i].ProductID
		product, ok := cache[pid]
		if !ok {
			row, err := q.GetProductByIDAny(ctx, pid)
			if err != nil {
				continue
			}
			product = row
			cache[pid] = product
		}
		productModel := store.ToProduct(product)
		reviews[i].ProductName = productModel.Name
		if len(productModel.Images) > 0 {
			reviews[i].ProductImage = productModel.Images[0]
		}
	}
	return reviews
}

// ReplyToReview godoc
// @Summary Reply to review
// @Description Vendor replies to a review on one of their products.
// @Tags Vendor
// @Accept json
// @Produce json
// @Security Bearer
// @Param reviewID path string true "Review ID"
// @Param body body models.ReplyToReviewRequest true "Reply payload"
// @Success 200 {object} models.Review
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /vendor/reviews/{reviewID}/reply [post]
func ReplyToReview() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		reviewID := c.Param("reviewID")
		var req models.ReplyToReviewRequest
		if !bindJSON(c, &req) {
			return
		}
		reply := strings.TrimSpace(req.Reply)
		if reply == "" {
			utils.Error(c, http.StatusBadRequest, "Reply text is required")
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		review, err := q.GetReviewByID(ctx, reviewID)
		if handleNotFound(c, err, "Review not found", "Failed to fetch review") {
			return
		}
		if review.VendorID == "" {
			product, err := q.GetProductByID(ctx, review.ProductID)
			if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
				return
			}
			review.VendorID = product.VendorID
		}
		if review.VendorID != vendorID {
			utils.Error(c, http.StatusForbidden, "You can only reply to reviews on your products")
			return
		}

		if err := q.UpdateReviewReply(ctx, sqlc.UpdateReviewReplyParams{
			ID:            reviewID,
			VendorReply:   sql.NullString{String: reply, Valid: true},
			VendorReplyAt: sql.NullTime{Time: utils.Now(), Valid: true},
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to add review reply")
			return
		}

		review, err = q.GetReviewByID(ctx, reviewID)
		if handleNotFound(c, err, "Review not found", "Failed to fetch review") {
			return
		}

		reviewModel := store.ToReview(review)
		enriched := enrichReviewsWithProducts(ctx, q, []models.Review{reviewModel})
		utils.Success(c, enriched[0])
	}
}

func updateProductRating(ctx context.Context, q *sqlc.Queries, productID string) {
	avgRaw, _ := q.AvgRatingByProduct(ctx, productID)
	count, _ := q.CountReviewsByProductID(ctx, productID)
	avg := store.ToFloat(avgRaw)
	_ = q.UpdateProductRating(ctx, sqlc.UpdateProductRatingParams{
		Rating:      sql.NullString{String: store.FloatToDecimalString(avg), Valid: true},
		ReviewCount: sql.NullInt32{Int32: int32(count), Valid: true},
		ID:          productID,
	})
}
