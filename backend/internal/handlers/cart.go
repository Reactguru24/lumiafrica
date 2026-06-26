package handlers

import (
	"context"
	"database/sql"
	"errors"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func cartOwner(c *gin.Context) (*types.BinaryUUID, string) {
	if uid, ok := middleware.OptionalUserID(c); ok {
		id, err := utils.ParseID(uid)
		if err == nil {
			return &id, ""
		}
	}
	return nil, middleware.GetGuestSessionID(c)
}

func guestSessionNull(sessionKey string) sql.NullString {
	return sql.NullString{String: sessionKey, Valid: sessionKey != ""}
}

func guestWishlistExpiry() sql.NullTime {
	return sql.NullTime{Time: time.Now().Add(30 * 24 * time.Hour), Valid: true}
}

func getOrCreateCart(ctx context.Context, q *sqlc.Queries, userID *types.BinaryUUID, sessionKey string) (sqlc.Cart, error) {
	if userID != nil {
		cart, err := q.GetCartByUserID(ctx, userID)
		if err == nil {
			return cart, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return sqlc.Cart{}, err
		}
		cartID := utils.GenerateBinaryID()
		if err := q.CreateCart(ctx, sqlc.CreateCartParams{
			ID: cartID, UserID: userID, SessionKey: sql.NullString{},
		}); err != nil {
			return sqlc.Cart{}, err
		}
		return q.GetCartByUserID(ctx, userID)
	}
	if sessionKey == "" {
		return sqlc.Cart{}, sql.ErrNoRows
	}
	sk := guestSessionNull(sessionKey)
	cart, err := q.GetCartBySessionKey(ctx, sk)
	if err == nil {
		return cart, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return sqlc.Cart{}, err
	}
	cartID := utils.GenerateBinaryID()
	expires := guestWishlistExpiry()
	if err := q.CreateCart(ctx, sqlc.CreateCartParams{
		ID:         cartID,
		UserID:     nil,
		SessionKey: sk,
		ExpiresAt:  expires,
	}); err != nil {
		return sqlc.Cart{}, err
	}
	return q.GetCartBySessionKey(ctx, sk)
}

func toCartResponse(c *gin.Context, rows []sqlc.ListCartItemsByCartIDRow, wishlist []string) models.CartResponse {
	out := models.CartResponse{
		Items:    make([]models.CartItemResponse, len(rows)),
		Wishlist: wishlist,
	}
	if !middleware.IsAuthenticated(c) {
		out.GuestSessionID = middleware.GetGuestSessionID(c)
	}
	for i, row := range rows {
		out.Items[i] = models.CartItemResponse{
			ProductID: row.VariantProductID.String(),
			Quantity:  int(row.CartItem.Quantity),
			Size:      row.VariantSize,
			Color:     row.VariantColor,
		}
	}
	return out
}

func loadWishlistIDs(ctx context.Context, q *sqlc.Queries, userID *types.BinaryUUID, sessionKey string) ([]string, error) {
	var ids []types.BinaryUUID
	var err error
	if userID != nil {
		ids, err = q.ListWishlistByUser(ctx, userID)
	} else if sessionKey != "" {
		ids, err = q.ListWishlistBySessionKey(ctx, guestSessionNull(sessionKey))
	}
	if err != nil {
		return nil, err
	}
	wishlist := make([]string, len(ids))
	for i, id := range ids {
		wishlist[i] = id.String()
	}
	return wishlist, nil
}

func loadCart(ctx context.Context, q *sqlc.Queries, userID *types.BinaryUUID, sessionKey string) ([]sqlc.ListCartItemsByCartIDRow, []string, error) {
	cart, err := getOrCreateCart(ctx, q, userID, sessionKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			wishlist, wErr := loadWishlistIDs(ctx, q, userID, sessionKey)
			if wErr != nil {
				return nil, nil, wErr
			}
			return nil, wishlist, nil
		}
		return nil, nil, err
	}
	items, err := q.ListCartItemsByCartID(ctx, cart.ID)
	if err != nil {
		return nil, nil, err
	}
	wishlist, err := loadWishlistIDs(ctx, q, userID, sessionKey)
	if err != nil {
		return nil, nil, err
	}
	return items, wishlist, nil
}

func toggleUserWishlist(ctx context.Context, q *sqlc.Queries, userID, productID types.BinaryUUID) error {
	wishlistIDs, err := q.ListWishlistByUser(ctx, &userID)
	if err != nil {
		return err
	}
	for _, id := range wishlistIDs {
		if id == productID {
			return q.RemoveWishlistItemByUser(ctx, sqlc.RemoveWishlistItemByUserParams{
				UserID: &userID, ProductID: productID,
			})
		}
	}
	return q.AddWishlistItemForUser(ctx, sqlc.AddWishlistItemForUserParams{
		ID: utils.GenerateBinaryID(), UserID: &userID, ProductID: productID,
	})
}

func setUserWishlist(ctx context.Context, q *sqlc.Queries, userID, productID types.BinaryUUID, active bool) error {
	wishlistIDs, err := q.ListWishlistByUser(ctx, &userID)
	if err != nil {
		return err
	}
	exists := false
	for _, id := range wishlistIDs {
		if id == productID {
			exists = true
			break
		}
	}
	if active {
		if exists {
			return nil
		}
		return q.AddWishlistItemForUser(ctx, sqlc.AddWishlistItemForUserParams{
			ID: utils.GenerateBinaryID(), UserID: &userID, ProductID: productID,
		})
	}
	if !exists {
		return nil
	}
	return q.RemoveWishlistItemByUser(ctx, sqlc.RemoveWishlistItemByUserParams{
		UserID: &userID, ProductID: productID,
	})
}

func toggleGuestWishlist(ctx context.Context, q *sqlc.Queries, sessionKey string, productID types.BinaryUUID) error {
	sk := guestSessionNull(sessionKey)
	wishlistIDs, err := q.ListWishlistBySessionKey(ctx, sk)
	if err != nil {
		return err
	}
	for _, id := range wishlistIDs {
		if id == productID {
			return q.RemoveWishlistItemBySession(ctx, sqlc.RemoveWishlistItemBySessionParams{
				SessionKey: sk, ProductID: productID,
			})
		}
	}
	return q.AddWishlistItemForSession(ctx, sqlc.AddWishlistItemForSessionParams{
		ID:         utils.GenerateBinaryID(),
		SessionKey: sk,
		ProductID:  productID,
		ExpiresAt:  guestWishlistExpiry(),
	})
}

func setGuestWishlist(ctx context.Context, q *sqlc.Queries, sessionKey string, productID types.BinaryUUID, active bool) error {
	sk := guestSessionNull(sessionKey)
	wishlistIDs, err := q.ListWishlistBySessionKey(ctx, sk)
	if err != nil {
		return err
	}
	exists := false
	for _, id := range wishlistIDs {
		if id == productID {
			exists = true
			break
		}
	}
	if active {
		if exists {
			return nil
		}
		return q.AddWishlistItemForSession(ctx, sqlc.AddWishlistItemForSessionParams{
			ID:         utils.GenerateBinaryID(),
			SessionKey: sk,
			ProductID:  productID,
			ExpiresAt:  guestWishlistExpiry(),
		})
	}
	if !exists {
		return nil
	}
	return q.RemoveWishlistItemBySession(ctx, sqlc.RemoveWishlistItemBySessionParams{
		SessionKey: sk, ProductID: productID,
	})
}

// GetCart godoc
// @Summary Get cart and wishlist
// @Description Returns cart items and wishlist product IDs. Works for guests (X-Guest-Session header) or signed-in customers.
// @Tags Guest
// @Produce json
// @Param X-Guest-Session header string false "Guest session ID (auto-set if omitted)"
// @Success 200 {object} models.CartResponse
// @Router /cart [get]
func GetCart() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		userID, sessionKey := cartOwner(c)
		if userID == nil && sessionKey == "" {
			utils.Error(c, http.StatusBadRequest, "Missing cart session")
			return
		}
		items, wishlist, err := loadCart(ctx, getStore(c).Queries(), userID, sessionKey)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// UpsertCartItem godoc
// @Summary Add or update cart item
// @Description Add a product variant to the cart or update its quantity. Works for guests or signed-in customers.
// @Tags Guest
// @Accept json
// @Produce json
// @Param X-Guest-Session header string false "Guest session ID"
// @Param item body models.UpsertCartItemRequest true "Cart item"
// @Success 200 {object} models.CartResponse
// @Router /cart/items [post]
func UpsertCartItem() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpsertCartItemRequest
		if !bindJSON(c, &req) {
			return
		}
		qty := req.Quantity
		if qty < 1 {
			qty = 1
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)
		if userID == nil && sessionKey == "" {
			utils.Error(c, http.StatusBadRequest, "Missing cart session")
			return
		}

		productID, err := utils.ParseID(req.ProductID)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid product ID")
			return
		}
		variant, err := q.GetVariantByProductSizeColor(ctx, sqlc.GetVariantByProductSizeColorParams{
			ProductID: productID, Size: req.Size, Color: req.Color,
		})
		if handleNotFound(c, err, "Variant not found", "Failed to resolve variant") {
			return
		}

		cart, err := getOrCreateCart(ctx, q, userID, sessionKey)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}

		existing, err := q.GetCartItemByCartAndVariant(ctx, sqlc.GetCartItemByCartAndVariantParams{
			CartID: cart.ID, VariantID: variant.ID,
		})
		if errors.Is(err, sql.ErrNoRows) {
			if err := q.CreateCartItem(ctx, sqlc.CreateCartItemParams{
				ID: utils.GenerateBinaryID(), CartID: cart.ID, VariantID: variant.ID, Quantity: int32(qty),
			}); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to add item")
				return
			}
		} else if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart item")
			return
		} else {
			if err := q.UpdateCartItemQuantity(ctx, sqlc.UpdateCartItemQuantityParams{
				Quantity: int32(qty), ID: existing.ID,
			}); err != nil {
				utils.Error(c, http.StatusInternalServerError, "Failed to update item")
				return
			}
		}

		items, wishlist, err := loadCart(ctx, q, userID, sessionKey)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// RemoveCartItem godoc
// @Summary Remove cart item
// @Description Remove a variant from the cart by product ID, size, and color query params.
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Param size query string true "Variant size"
// @Param color query string true "Variant color"
// @Param X-Guest-Session header string false "Guest session ID"
// @Success 200 {object} models.CartResponse
// @Router /cart/items/{productID} [delete]
func RemoveCartItem() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		size := c.Query("size")
		color := c.Query("color")
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)

		variant, err := q.GetVariantByProductSizeColor(ctx, sqlc.GetVariantByProductSizeColorParams{
			ProductID: productID, Size: size, Color: color,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
				utils.Success(c, toCartResponse(c, items, wishlist))
				return
			}
			utils.Error(c, http.StatusInternalServerError, "Failed to resolve variant")
			return
		}
		cart, err := getOrCreateCart(ctx, q, userID, sessionKey)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}
		existing, err := q.GetCartItemByCartAndVariant(ctx, sqlc.GetCartItemByCartAndVariantParams{
			CartID: cart.ID, VariantID: variant.ID,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
				utils.Success(c, toCartResponse(c, items, wishlist))
				return
			}
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart item")
			return
		}
		if err := q.DeleteCartItem(ctx, existing.ID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to remove item")
			return
		}
		items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// ToggleCartItemSaved godoc
// @Summary Toggle save-for-later on cart item
// @Description Save-for-later is tracked client-side in schema v2; returns the current cart unchanged.
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Param X-Guest-Session header string false "Guest session ID"
// @Success 200 {object} models.CartResponse
// @Router /cart/items/{productID}/saved [put]
func ToggleCartItemSaved() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)
		items, wishlist, err := loadCart(ctx, q, userID, sessionKey)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// ClearActiveCart godoc
// @Summary Clear all cart items
// @Description Removes all items from the active cart. Wishlist is preserved.
// @Tags Guest
// @Produce json
// @Param X-Guest-Session header string false "Guest session ID"
// @Success 200 {object} models.CartResponse
// @Router /cart/active [delete]
func ClearActiveCart() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)
		cart, err := getOrCreateCart(ctx, q, userID, sessionKey)
		if err == nil {
			_ = q.ClearCartItems(ctx, cart.ID)
		}
		items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// ToggleWishlist godoc
// @Summary Toggle product on wishlist
// @Description Add or remove a product from the wishlist. Supports guest sessions and signed-in customers.
// @Tags Guest
// @Produce json
// @Param productID path string true "Product ID"
// @Param X-Guest-Session header string false "Guest session ID"
// @Success 200 {object} models.CartResponse
// @Router /cart/wishlist/{productID} [post]
func ToggleWishlist() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)
		if userID == nil && sessionKey == "" {
			utils.Error(c, http.StatusBadRequest, "Missing guest session")
			return
		}

		var err error
		if userID != nil {
			err = toggleUserWishlist(ctx, q, *userID, productID)
		} else {
			err = toggleGuestWishlist(ctx, q, sessionKey, productID)
		}
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update wishlist")
			return
		}
		items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

// SetWishlist godoc
// @Summary Set product wishlist state
// @Description Idempotently add or remove a product from the wishlist for a guest session or signed-in customer.
// @Tags Guest
// @Accept json
// @Produce json
// @Param productID path string true "Product ID"
// @Param body body models.SetWishlistRequest true "Desired wishlist state"
// @Param X-Guest-Session header string false "Guest session ID"
// @Success 200 {object} models.CartResponse
// @Router /cart/wishlist/{productID} [put]
func SetWishlist() gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := parsePathID(c, "productID")
		if !ok {
			return
		}
		var req models.SetWishlistRequest
		if !bindJSON(c, &req) {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		userID, sessionKey := cartOwner(c)
		if userID == nil && sessionKey == "" {
			utils.Error(c, http.StatusBadRequest, "Missing guest session")
			return
		}

		var err error
		if userID != nil {
			err = setUserWishlist(ctx, q, *userID, productID, req.Active)
		} else {
			err = setGuestWishlist(ctx, q, sessionKey, productID, req.Active)
		}
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update wishlist")
			return
		}
		items, wishlist, _ := loadCart(ctx, q, userID, sessionKey)
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}

func guestSessionKey(c *gin.Context) string {
	if id := middleware.GetGuestSessionID(c); id != "" {
		return id
	}
	return c.GetHeader(middleware.GuestSessionHeader)
}

// mergeGuestCartSession moves guest cart items into the user's cart (by session_key).
// If the user has no cart yet, the guest cart row is reassigned. Otherwise items are merged.
func mergeGuestCartSession(ctx context.Context, q *sqlc.Queries, userID types.BinaryUUID, sessionKey string) error {
	if sessionKey == "" {
		return nil
	}
	sk := guestSessionNull(sessionKey)
	guestCart, err := q.GetCartBySessionKey(ctx, sk)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}

	userCart, err := q.GetCartByUserID(ctx, &userID)
	if errors.Is(err, sql.ErrNoRows) {
		return q.AssignGuestCartToUser(ctx, sqlc.AssignGuestCartToUserParams{
			UserID: &userID, SessionKey: sk,
		})
	}
	if err != nil {
		return err
	}
	if guestCart.ID == userCart.ID {
		return nil
	}

	guestItems, err := q.ListCartItemsByCartID(ctx, guestCart.ID)
	if err != nil {
		return err
	}
	for _, row := range guestItems {
		item := row.CartItem
		existing, err := q.GetCartItemByCartAndVariant(ctx, sqlc.GetCartItemByCartAndVariantParams{
			CartID: userCart.ID, VariantID: item.VariantID,
		})
		if errors.Is(err, sql.ErrNoRows) {
			if err := q.CreateCartItem(ctx, sqlc.CreateCartItemParams{
				ID:        utils.GenerateBinaryID(),
				CartID:    userCart.ID,
				VariantID: item.VariantID,
				Quantity:  item.Quantity,
			}); err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return err
		}
		if err := q.UpdateCartItemQuantity(ctx, sqlc.UpdateCartItemQuantityParams{
			Quantity: existing.Quantity + item.Quantity,
			ID:       existing.ID,
		}); err != nil {
			return err
		}
	}
	return q.DeleteCartByID(ctx, guestCart.ID)
}

func mergeGuestWishlist(ctx context.Context, q *sqlc.Queries, userID types.BinaryUUID, sessionKey string) error {
	if sessionKey == "" {
		return nil
	}
	sk := guestSessionNull(sessionKey)
	productIDs, err := q.ListWishlistBySessionKey(ctx, sk)
	if err != nil {
		return err
	}
	for _, productID := range productIDs {
		_ = q.AddWishlistItemForUser(ctx, sqlc.AddWishlistItemForUserParams{
			ID:        utils.GenerateBinaryID(),
			UserID:    &userID,
			ProductID: productID,
		})
	}
	return q.DeleteWishlistBySessionKey(ctx, sk)
}

// MergeGuestCart godoc
// @Summary Merge guest cart into customer account
// @Description After login, merges guest cart and wishlist (from X-Guest-Session) into the signed-in customer account.
// @Tags Customer
// @Produce json
// @Security Bearer
// @Param X-Guest-Session header string false "Guest session ID to merge"
// @Success 200 {object} models.CartResponse
// @Router /cart/merge [post]
func MergeGuestCart() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := middleware.GetUserID(c)
		userID, err := utils.ParseID(userIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		guestID := guestSessionKey(c)
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if err := mergeGuestCartSession(ctx, q, userID, guestID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to merge guest cart")
			return
		}
		if err := mergeGuestWishlist(ctx, q, userID, guestID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to merge guest wishlist")
			return
		}
		items, wishlist, err := loadCart(ctx, q, &userID, "")
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to load cart")
			return
		}
		utils.Success(c, toCartResponse(c, items, wishlist))
	}
}
