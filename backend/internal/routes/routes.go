package routes

import (
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/handlers"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/redis"
	"github.com/Reactguru24/lumiafrica/internal/store"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, st *store.Store, cfg *config.Config, rc *redis.Client) {
	router.Use(func(c *gin.Context) {
		c.Set("store", st)
		c.Set("config", cfg)
		c.Set("redis", rc)
		c.Next()
	})
	guestCart := router.Group("")
	guestCart.Use(middleware.GuestSessionMiddleware(cfg), middleware.OptionalAuthMiddleware(cfg))
	{
		guestCart.GET("/cart", handlers.GetCart())
		guestCart.POST("/cart/items", handlers.UpsertCartItem())
		guestCart.DELETE("/cart/items/:productID", handlers.RemoveCartItem())
		guestCart.PUT("/cart/items/:productID/saved", handlers.ToggleCartItemSaved())
		guestCart.DELETE("/cart/active", handlers.ClearActiveCart())
		guestCart.POST("/cart/wishlist/:productID", handlers.ToggleWishlist())
		guestCart.PUT("/cart/wishlist/:productID", handlers.SetWishlist())
	}

	registerSwaggerRoutes(router, cfg)

	router.GET("/health", handlers.Health())

	router.Static("/uploads", "./uploads")

	auth := middleware.AuthMiddleware(cfg)
	activeUser := middleware.ActiveUserMiddleware()

	// ── Guest (public) ───────────────────────────────────────────────────
	// Auth entry and marketplace browsing — no login required.
	router.POST("/auth/login", handlers.Login(cfg))
	router.POST("/auth/register", handlers.Register(cfg))
	router.POST("/auth/forgot-password", handlers.ForgotPassword(cfg))
	router.POST("/auth/reset-password", handlers.ResetPassword())

	router.GET("/products/filters", handlers.GetProductFilters())
	router.GET("/products/homepage", handlers.GetHomepageProducts())
	router.GET("/products", handlers.ListProducts())
	router.GET("/products/:productID", handlers.GetProduct())
	router.GET("/vendors", handlers.ListVendors())
	router.GET("/vendors/featured", handlers.GetFeaturedVendors())
	router.GET("/vendors/:vendorID", handlers.GetVendor())
	router.POST("/vendors/applications", handlers.ApplyVendor())
	router.GET("/vendors/applications/status", handlers.GetVendorApplicationStatus())
	router.POST("/uploads/images", handlers.UploadImage(cfg))
	router.POST("/uploads/documents", handlers.UploadDocument(cfg))

	router.GET("/reviews/product/:productID", handlers.GetProductReviews())
	router.GET("/subscriptions/plans", handlers.GetSubscriptionPlans(cfg))
	router.POST("/webhooks/paystack", handlers.PaystackWebhook(cfg))

	// ── Commerce (public) ─────────────────────────────────────────────────
	router.GET("/delivery-zones", handlers.ListDeliveryZones())
	router.GET("/promotions", handlers.ListActivePromotions())
	router.GET("/collections", handlers.ListCollections())
	router.GET("/collections/:slug", handlers.GetCollection())

	router.POST("/auth/upload", auth, activeUser, handlers.UploadImage(cfg))

	// ── Signed-in user (any role) ──────────────────────────────────────────
	router.GET("/auth/me", auth, activeUser, middleware.AuthenticatedRole(), handlers.GetCurrentUser())
	router.PUT("/users/profile", auth, activeUser, middleware.AuthenticatedRole(), handlers.UpdateProfile())
	router.PUT("/users/password", auth, activeUser, middleware.AuthenticatedRole(), handlers.ChangePassword())
	router.GET("/payments/verify", auth, activeUser, middleware.AuthenticatedRole(), handlers.VerifyPayment(cfg))

	// ── Customer — checkout, account, and UGC ────────────────────────────
	customer := router.Group("")
	customer.Use(auth, activeUser, middleware.RoleMiddleware(models.RoleCustomer))
	{
		customer.POST("/users/addresses", handlers.AddAddress())
		customer.GET("/users/addresses", handlers.GetAddresses())
		customer.DELETE("/users/addresses/:addressID", handlers.DeleteAddress())

		customer.POST("/payments/orders/initialize", handlers.InitializeOrderPayment(cfg))
		customer.GET("/orders", handlers.GetUserOrders())
		customer.GET("/orders/:orderID", handlers.GetOrder())

		customer.POST("/coupons/validate", handlers.ValidateCoupon())
		customer.POST("/reviews", handlers.CreateReview())
		customer.POST("/cart/merge", middleware.GuestSessionMiddleware(cfg), handlers.MergeGuestCart())
	}

	// ── Vendor — store operations ──────────────────────────────────────────
	vendor := router.Group("/vendor")
	vendor.Use(auth, activeUser, middleware.RoleMiddleware(models.RoleVendor))
	{
		vendor.GET("/profile", handlers.GetVendorProfile())
		vendor.PUT("/profile", handlers.UpdateVendorProfile())
		vendor.GET("/products", handlers.GetVendorProducts())
		vendor.POST("/products", handlers.CreateProduct())
		vendor.PUT("/products/:productID/featured", handlers.SetVendorProductFeatured())
		vendor.PUT("/products/:productID", handlers.UpdateProduct())
		vendor.POST("/products/:productID/restore", handlers.RestoreProduct())
		vendor.DELETE("/products/:productID", handlers.DeleteProduct())
		vendor.GET("/orders", handlers.GetVendorOrders())
		vendor.PUT("/orders/:orderID/status", handlers.UpdateOrderStatus())
		vendor.GET("/reviews", handlers.GetVendorReviews())
		vendor.POST("/reviews/:reviewID/reply", handlers.ReplyToReview())
		vendor.GET("/subscriptions/active", handlers.GetVendorSubscription())
		vendor.GET("/subscriptions/history", handlers.GetVendorSubscriptionHistory())
		vendor.POST("/subscriptions", handlers.SubscribeVendor(cfg))
		vendor.POST("/subscriptions/initialize", handlers.InitializeSubscriptionPayment(cfg))
		vendor.DELETE("/subscriptions/active", handlers.CancelSubscription())
		vendor.GET("/analytics", handlers.GetVendorAnalytics())
	}

	// ── Admin — platform management ────────────────────────────────────────
	admin := router.Group("/admin")
	admin.Use(auth, activeUser, middleware.RoleMiddleware(models.RoleAdmin))
	{
		admin.GET("/users", handlers.ListUsers())
		admin.POST("/users/:userID/disable", handlers.DisableUser())
		admin.POST("/users/:userID/enable", handlers.EnableUser())
		admin.GET("/products", handlers.ListAdminProducts())
		admin.GET("/products/pending", handlers.ListPendingProducts())
		admin.POST("/products/:productID/moderate", handlers.ModerateProduct())
		admin.PUT("/products/:productID/featured", handlers.SetAdminProductFeatured())
		admin.GET("/featured-listings", handlers.GetAdminFeaturedListings())
		admin.GET("/vendors/applications", handlers.ListVendorApplications())
		admin.GET("/vendors", handlers.ListAdminVendors())
		admin.POST("/vendor-applications/:applicationID/approve", handlers.ApproveVendor(cfg))
		admin.POST("/vendor-applications/:applicationID/reject", handlers.RejectVendor())
		admin.POST("/vendor-applications/:applicationID/resend-activation", handlers.ResendVendorActivationByApplication(cfg))
		admin.POST("/vendors/:vendorID/resend-activation", handlers.ResendVendorActivationByVendor(cfg))
		admin.POST("/vendors/:vendorID/featured", handlers.FeatureVendor())
		admin.GET("/subscriptions", handlers.GetAdminSubscriptions())
		admin.GET("/analytics", handlers.GetAdminAnalytics())
		admin.GET("/platform-settings", handlers.GetAdminPlatformSettings())
		admin.PUT("/platform-settings", handlers.UpdateAdminPlatformSettings())
		admin.GET("/orders", handlers.GetAllOrders())
		admin.PUT("/orders/:orderID/status", handlers.AdminUpdateOrderStatus())
		admin.GET("/coupons", handlers.ListAdminCoupons())
		admin.POST("/coupons", handlers.CreateAdminCoupon())
		admin.PUT("/coupons/:couponID", handlers.UpdateAdminCoupon())
		admin.PUT("/coupons/:couponID/active", handlers.SetAdminCouponActive())
		admin.GET("/promotions", handlers.ListAdminPromotions())
		admin.POST("/promotions", handlers.CreateAdminPromotion())
		admin.PUT("/promotions/:promotionID", handlers.UpdateAdminPromotion())
		admin.PUT("/promotions/:promotionID/active", handlers.SetAdminPromotionActive())
		admin.GET("/collections", handlers.ListAdminCollections())
		admin.POST("/collections", handlers.CreateAdminCollection())
		admin.PUT("/collections/:collectionID", handlers.UpdateAdminCollection())
		admin.PUT("/collections/:collectionID/active", handlers.SetAdminCollectionActive())
	}
}
