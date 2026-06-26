package handlers

import (
	"database/sql"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func currentUserID(c *gin.Context) (types.BinaryUUID, bool) {
	userID, err := utils.ParseID(middleware.GetUserID(c))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid user")
		return types.BinaryUUID{}, false
	}
	return userID, true
}

// UpdateProfile godoc
// @Summary Update user profile
// @Description Update full name, phone, or avatar for the signed-in user.
// @Tags Users
// @Accept json
// @Produce json
// @Security Bearer
// @Param profile body models.UpdateProfileRequest true "Profile updates"
// @Success 200 {object} models.User
// @Router /users/profile [put]
func UpdateProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		var req models.UpdateProfileRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()
		if _, err := q.GetUserByID(ctx, userID); handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}

		params := sqlc.UpdateUserProfileParams{ID: userID}
		if req.FullName != "" {
			params.FullName = sql.NullString{String: req.FullName, Valid: true}
		}
		if req.Phone != "" {
			params.Phone = sql.NullString{String: req.Phone, Valid: true}
		}
		if req.Avatar != nil {
			params.Avatar = sql.NullString{String: *req.Avatar, Valid: true}
		}

		if err := q.UpdateUserProfile(ctx, params); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to update profile")
			return
		}

		row, _ := q.GetUserByID(ctx, userID)
		user := store.ToUser(row)
		user.Sanitize()
		utils.Success(c, user)
	}
}

// AddAddress godoc
// @Summary Add shipping address
// @Description Add a new address for the signed-in customer.
// @Tags Customer
// @Accept json
// @Produce json
// @Security Bearer
// @Param address body models.AddAddressRequest true "Address details"
// @Success 201 {object} models.Address
// @Router /users/addresses [post]
func AddAddress() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		var req models.AddAddressRequest
		if !bindJSON(c, &req) {
			return
		}

		addressID := utils.GenerateBinaryID()
		address := models.Address{
			ID:        addressID.String(),
			UserID:    userID.String(),
			Label:     req.Label,
			Street:    req.Street,
			City:      req.City,
			State:     req.State,
			Country:   req.Country,
			ZipCode:   req.ZipCode,
			IsDefault: req.IsDefault,
		}

		ctx := c.Request.Context()
		if err := getStore(c).Queries().CreateAddress(ctx, sqlc.CreateAddressParams{
			ID:        addressID,
			UserID:    userID,
			Label:     address.Label,
			Street:    address.Street,
			City:      address.City,
			State:     address.State,
			Country:   address.Country,
			ZipCode:   address.ZipCode,
			IsDefault: int16Bool(address.IsDefault),
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to add address")
			return
		}

		utils.SuccessCreated(c, address)
	}
}

// GetAddresses godoc
// @Summary List shipping addresses
// @Description Returns all addresses for the signed-in customer.
// @Tags Customer
// @Produce json
// @Security Bearer
// @Success 200 {array} models.Address
// @Router /users/addresses [get]
func GetAddresses() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		rows, err := getStore(c).Queries().ListAddressesByUser(ctx, userID)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch addresses")
			return
		}

		addresses := make([]models.Address, len(rows))
		for i, row := range rows {
			addresses[i] = store.ToAddress(row)
		}
		utils.Success(c, addresses)
	}
}

// DeleteAddress godoc
// @Summary Delete shipping address
// @Description Remove an address belonging to the signed-in customer.
// @Tags Customer
// @Produce json
// @Security Bearer
// @Param addressID path string true "Address ID"
// @Success 200 {object} map[string]interface{}
// @Router /users/addresses/{addressID} [delete]
func DeleteAddress() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		addressID, ok := parsePathID(c, "addressID")
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if _, err := q.GetAddressByIDAndUser(ctx, sqlc.GetAddressByIDAndUserParams{
			ID: addressID, UserID: userID,
		}); handleNotFound(c, err, "Address not found", "Failed to fetch address") {
			return
		}

		if err := q.DeleteAddress(ctx, sqlc.DeleteAddressParams{ID: addressID, UserID: userID}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to delete address")
			return
		}

		utils.Success(c, gin.H{"deleted": true})
	}
}

// ChangePassword godoc
// @Summary Change password
// @Description Update password for the signed-in user.
// @Tags Users
// @Accept json
// @Produce json
// @Security Bearer
// @Param password body models.ChangePasswordRequest true "Current and new password"
// @Success 200 {object} map[string]interface{}
// @Router /users/password [put]
func ChangePassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := currentUserID(c)
		if !ok {
			return
		}
		var req models.ChangePasswordRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()

		row, err := q.GetUserByID(ctx, userID)
		if handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}

		user := store.ToUser(row)
		if !utils.VerifyPassword(user.Password, req.CurrentPassword) {
			utils.Error(c, http.StatusBadRequest, "Your current password is incorrect.")
			return
		}

		hashedPassword, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		if err := q.UpdateUserPassword(ctx, sqlc.UpdateUserPasswordParams{
			ID: userID, Password: hashedPassword,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		utils.Success(c, gin.H{"message": "Your password has been updated successfully."})
	}
}
