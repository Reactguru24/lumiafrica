package routes

import (
	"lumi-backend/internal/config"
	"lumi-backend/internal/handlers"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, st *store.Store, cfg *config.Config) {
	router.Use(func(c *gin.Context) {
		c.Set("store", st)
		c.Next()
	})

	registerSwaggerRoutes(router)

	router.Static("/uploads", "./uploads")

	auth := middleware.AuthMiddleware(cfg)

	// ── Guest (public) ───────────────────────────────────────────────────
	// Health, auth entry, and marketplace browsing — no login required.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})
	router.POST("/auth/login", handlers.Login(cfg))
	router.POST("/auth/register", handlers.Register(cfg))
	router.POST("/auth/forgot-password", handlers.ForgotPassword(cfg))
	router.POST("/auth/reset-password", handlers.ResetPassword())

	router.GET("/products/filters", handlers.GetProductFilters())
	router.GET("/products", handlers.ListProducts())
	router.GET("/products/:productID", handlers.GetProduct())
	router.GET("/vendors", handlers.ListVendors())
	router.GET("/vendors/featured", handlers.GetFeaturedVendors())
	router.GET("/vendors/:vendorID", handlers.GetVendor())

	router.GET("/reviews/product/:productID", handlers.GetProductReviews())
	router.GET("/subscriptions/plans", handlers.GetSubscriptionPlans())

	router.POST("/auth/upload", auth, handlers.UploadImage(cfg))

	// ── Signed-in user (any role) ──────────────────────────────────────────
	router.GET("/auth/me", auth, middleware.AuthenticatedRole(), handlers.GetCurrentUser())
	router.PUT("/users/profile", auth, middleware.AuthenticatedRole(), handlers.UpdateProfile())
	router.PUT("/users/password", auth, middleware.AuthenticatedRole(), handlers.ChangePassword())

	// ── Customer — checkout, account, and UGC ────────────────────────────
	customer := router.Group("")
	customer.Use(auth, middleware.RoleMiddleware(models.RoleCustomer))
	{
		customer.POST("/users/addresses", handlers.AddAddress())
		customer.GET("/users/addresses", handlers.GetAddresses())
		customer.DELETE("/users/addresses/:addressID", handlers.DeleteAddress())

		customer.POST("/orders", handlers.CreateOrder())
		customer.GET("/orders", handlers.GetUserOrders())
		customer.GET("/orders/:orderID", handlers.GetOrder())

		customer.POST("/reviews", handlers.CreateReview())
		customer.POST("/vendors/applications", handlers.ApplyVendor())
		customer.GET("/vendors/applications/me", handlers.GetMyVendorApplication())
	}

	// ── Vendor — store operations ──────────────────────────────────────────
	vendor := router.Group("/vendor")
	vendor.Use(auth, middleware.RoleMiddleware(models.RoleVendor))
	{
		vendor.GET("/profile", handlers.GetVendorProfile())
		vendor.PUT("/profile", handlers.UpdateVendorProfile())
		vendor.GET("/products", handlers.GetVendorProducts())
		vendor.POST("/products", handlers.CreateProduct())
		vendor.PUT("/products/:productID", handlers.UpdateProduct())
		vendor.DELETE("/products/:productID", handlers.DeleteProduct())
		vendor.GET("/orders", handlers.GetVendorOrders())
		vendor.PUT("/orders/:orderID/status", handlers.UpdateOrderStatus())
		vendor.GET("/reviews", handlers.GetVendorReviews())
		vendor.POST("/reviews/:reviewID/reply", handlers.ReplyToReview())
		vendor.GET("/subscriptions/active", handlers.GetVendorSubscription())
		vendor.GET("/subscriptions/history", handlers.GetVendorSubscriptionHistory())
		vendor.POST("/subscriptions", handlers.SubscribeVendor())
		vendor.DELETE("/subscriptions/active", handlers.CancelSubscription())
		vendor.GET("/analytics", handlers.GetVendorAnalytics())
	}

	// ── Admin — platform management ────────────────────────────────────────
	admin := router.Group("/admin")
	admin.Use(auth, middleware.RoleMiddleware(models.RoleAdmin))
	{
		admin.GET("/users", handlers.ListUsers())
		admin.POST("/users/:userID/disable", handlers.DisableUser())
		admin.GET("/products", handlers.ListAdminProducts())
		admin.GET("/products/pending", handlers.ListPendingProducts())
		admin.POST("/products/:productID/moderate", handlers.ModerateProduct())
		admin.GET("/vendors/applications", handlers.ListVendorApplications())
		admin.POST("/vendor-applications/:applicationID/approve", handlers.ApproveVendor())
		admin.POST("/vendor-applications/:applicationID/reject", handlers.RejectVendor())
		admin.POST("/vendors/:vendorID/featured", handlers.FeatureVendor())
		admin.GET("/subscriptions", handlers.GetAdminSubscriptions())
		admin.GET("/analytics", handlers.GetAdminAnalytics())
		admin.GET("/orders", handlers.GetAllOrders())
		admin.PUT("/orders/:orderID/status", handlers.UpdateOrderStatus())
	}
}
