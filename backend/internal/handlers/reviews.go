package handlers

import (
	"context"
	"database/sql"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CreateReview godoc
// @Summary Create a product review
// @Description Customer creates a review for a product (purchase optional)
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param review body models.CreateReviewRequest true "Review details"
// @Success 201 {object} map[string]interface{}
// @Router /reviews [post]
func CreateReview() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		var req models.CreateReviewRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		productID, err := utils.ParseID(req.ProductID)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid product ID")
			return
		}
		product, err := q.GetProductByID(ctx, productID)
		if handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}
		if _, err := q.GetReviewByProductAndUser(ctx, sqlc.GetReviewByProductAndUserParams{
			ProductID: productID, UserID: userID,
		}); err == nil {
			utils.Error(c, http.StatusBadRequest, "You have already reviewed this product")
			return
		}

		orderID := (*types.BinaryUUID)(nil)
		if req.OrderID != nil {
			orderIDVal := strings.TrimSpace(*req.OrderID)
			if orderIDVal != "" {
				parsedOrderID, err := utils.ParseID(orderIDVal)
				if err != nil {
					utils.Error(c, http.StatusBadRequest, "Invalid order ID")
					return
				}
				if _, err := q.GetOrderByIDAndUser(ctx, sqlc.GetOrderByIDAndUserParams{ID: parsedOrderID, UserID: userID}); err != nil {
					utils.Error(c, http.StatusForbidden, "Order not found or unauthorized")
					return
				}
				orderID = &parsedOrderID
			}
		}

		reviewID := utils.GenerateBinaryID()
		if err := q.CreateReview(ctx, sqlc.CreateReviewParams{
			ID: reviewID, ProductID: productID, VendorID: product.VendorID,
			UserID: userID, OrderID: orderID, Rating: int16(req.Rating), Comment: req.Comment,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create review")
			return
		}

		updateProductRating(ctx, q, productID)
		updateVendorRating(ctx, q, product.VendorID)
		utils.SuccessCreated(c, gin.H{"id": reviewID.String()})
	}
}

// GetProductReviews godoc
// @Summary Get product reviews
// @Description Get the latest reviews for a product (default 6)
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Success 200 {object} utils.PaginatedResponse{Data=[]models.Review}
// @Router /reviews/product/{productID} [get]
func GetProductReviews() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if _, err := q.GetProductByID(ctx, productID); handleNotFound(c, err, "Product not found", "Failed to fetch product") {
			return
		}

		page, limit, offset := pagination(c, 1, 6)
		if limit > 50 {
			limit = 50
		}
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
		reviews := enrichReviewsWithUsers(ctx, q, store.ToReviews(rows))
		respondPaginated(c, reviews, total, page, limit)
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
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
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
		reviews := enrichReviewsWithProducts(ctx, q, store.ToReviews(rows))
		reviews = enrichReviewsWithUsers(ctx, q, reviews)
		respondPaginated(c, reviews, total, page, limit)
	}
}

func enrichReviewsWithProducts(ctx context.Context, q *sqlc.Queries, reviews []models.Review) []models.Review {
	if len(reviews) == 0 {
		return reviews
	}
	cache := make(map[string]sqlc.Product)
	for i := range reviews {
		pid, err := utils.ParseID(reviews[i].ProductID)
		if err != nil {
			continue
		}
		product, ok := cache[reviews[i].ProductID]
		if !ok {
			row, err := q.GetProductByIDAny(ctx, pid)
			if err != nil {
				continue
			}
			product = row
			cache[reviews[i].ProductID] = product
		}
		productModel := store.LoadProduct(ctx, q, product)
		reviews[i].ProductName = productModel.Name
		if len(productModel.Images) > 0 {
			reviews[i].ProductImage = productModel.Images[0]
		}
	}
	return reviews
}

func enrichReviewsWithUsers(ctx context.Context, q *sqlc.Queries, reviews []models.Review) []models.Review {
	if len(reviews) == 0 {
		return reviews
	}
	cache := make(map[string]string)
	for i := range reviews {
		userID := reviews[i].UserID
		if name, ok := cache[userID]; ok {
			reviews[i].UserName = name
			continue
		}
		parsedUserID, err := utils.ParseID(userID)
		if err != nil {
			reviews[i].UserName = "Customer"
			continue
		}
		user, err := q.GetUserByID(ctx, parsedUserID)
		if err != nil {
			cache[userID] = "Customer"
			reviews[i].UserName = "Customer"
			continue
		}
		cache[userID] = user.FullName
		reviews[i].UserName = user.FullName
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
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
			return
		}
		reviewID, ok := parsePathID(c, "reviewID")
		if !ok {
			return
		}
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
		if review.VendorID.IsZero() {
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
		enriched := enrichReviewsWithUsers(ctx, q, enrichReviewsWithProducts(ctx, q, []models.Review{reviewModel}))
		utils.Success(c, enriched[0])
	}
}

func updateProductRating(ctx context.Context, q *sqlc.Queries, productID types.BinaryUUID) {
	avgRaw, _ := q.AvgRatingByProduct(ctx, productID)
	count, _ := q.CountReviewsByProductID(ctx, productID)
	avg := store.ToFloat(avgRaw)
	_ = q.UpdateProductRating(ctx, sqlc.UpdateProductRatingParams{
		Rating:      store.FloatToDecimalString(avg),
		ReviewCount: int32(count),
		ID:          productID,
	})
}

func updateVendorRating(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID) {
	avgRaw, _ := q.AvgRatingByVendor(ctx, vendorID)
	avg := store.ToFloat(avgRaw)
	_ = q.UpdateVendorRating(ctx, sqlc.UpdateVendorRatingParams{
		Rating: store.FloatToDecimalString(avg),
		ID:     vendorID,
	})
}
