package handlers

import (
	"database/sql"
	"errors"
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/middleware"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func uuidNullString(id types.BinaryUUID) sql.NullString {
	if id.IsZero() {
		return sql.NullString{}
	}
	return sql.NullString{String: id.String(), Valid: true}
}

func idPtrString(id *types.BinaryUUID) string {
	if id == nil || id.IsZero() {
		return ""
	}
	return id.String()
}

func getStore(c *gin.Context) *store.Store {
	return c.MustGet("store").(*store.Store)
}

func parseQuery(c *gin.Context, key string, defaultValue int) int {
	value := c.DefaultQuery(key, "")
	if value == "" {
		return defaultValue
	}
	if intVal, err := strconv.Atoi(value); err == nil {
		return intVal
	}
	return defaultValue
}

func pagination(c *gin.Context, pageDefault, limitDefault int) (page, limit, offset int) {
	page = parseQuery(c, "page", pageDefault)
	limit = parseQuery(c, "limit", limitDefault)
	if limit > 100 {
		limit = 100
	}
	if limit < 1 {
		limit = limitDefault
	}
	offset = (page - 1) * limit
	return page, limit, offset
}

func bindJSON(c *gin.Context, dest interface{}) bool {
	if err := c.ShouldBindJSON(dest); err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return false
	}
	return true
}

func respondPaginated(c *gin.Context, data interface{}, total int64, page, limit int) {
	c.JSON(200, gin.H{
		"items":  data,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func respondAuth(c *gin.Context, cfg *config.Config, user *models.User, status int, message string) {
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, cfg.JWTSecret, cfg.JWTExpiry)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	user.Sanitize()
	if status == http.StatusCreated {
		utils.SuccessCreated(c, models.AuthResponse{
			User:  user,
			Token: token,
		})
	} else {
		utils.Success(c, models.AuthResponse{
			User:  user,
			Token: token,
		})
	}
}

func getVendorID(c *gin.Context) (string, bool) {
	userID, err := utils.ParseID(middleware.GetUserID(c))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "Invalid user")
		return "", false
	}
	vendor, err := getStore(c).Queries().GetVendorByUserID(c.Request.Context(), userID)
	if handleNotFound(c, err, "Vendor profile not found", "Failed to fetch vendor") {
		return "", false
	}
	if vendor.Suspended != 0 {
		utils.Error(c, http.StatusForbidden, "Vendor account is suspended")
		return "", false
	}
	return vendor.ID.String(), true
}

func handleNotFound(c *gin.Context, err error, notFoundMsg, serverErrMsg string) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrNoRows) {
		utils.Error(c, http.StatusNotFound, notFoundMsg)
		return true
	}
	utils.Error(c, http.StatusInternalServerError, serverErrMsg)
	return true
}
