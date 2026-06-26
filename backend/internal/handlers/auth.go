package handlers

import (
	"database/sql"
	"errors"
	"log"
	"lumi-backend/internal/config"
	"lumi-backend/internal/email"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/middleware"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Login godoc
// @Summary Customer login
// @Description Login with email and password to get JWT token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body models.LoginRequest true "Login credentials"
// @Success 200 {object} models.AuthResponse
// @Router /auth/login [post]
func Login(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		row, err := getStore(c).Queries().GetUserByEmail(ctx, req.Email)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				if pending, checkErr := isPendingBusinessEmail(ctx, getStore(c).Queries(), req.Email); checkErr != nil {
					utils.Error(c, http.StatusInternalServerError, "Database error")
					return
				} else if pending {
					utils.Error(c, http.StatusForbidden, errApplicationUnderReviewForEmail(normalizeEmail(req.Email)))
					return
				}
				utils.Error(c, http.StatusUnauthorized, "Invalid email or password")
			} else {
				utils.Error(c, http.StatusInternalServerError, "Database error")
			}
			return
		}

		user := store.ToUser(row)
		if user.Disabled {
			utils.Error(c, http.StatusUnauthorized, "Account has been disabled")
			return
		}
		if !utils.VerifyPassword(user.Password, req.Password) {
			utils.Error(c, http.StatusUnauthorized, "Invalid email or password")
			return
		}

		respondAuth(c, cfg, &user, http.StatusOK, "Login successful")
	}
}

// Register godoc
// @Summary Customer registration
// @Description Register as a new customer
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body models.RegisterRequest true "Registration details"
// @Success 201 {object} models.AuthResponse
// @Router /auth/register [post]
func Register(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()

		if pending, checkErr := isPendingBusinessEmail(ctx, q, req.Email); checkErr != nil {
			utils.Error(c, http.StatusInternalServerError, "Database error")
			return
		} else if pending {
			utils.Error(c, http.StatusConflict, errApplicationUnderReviewForEmail(normalizeEmail(req.Email)))
			return
		}

		if _, err := q.GetUserByEmail(ctx, req.Email); err == nil {
			utils.Error(c, http.StatusConflict, "Email already registered")
			return
		} else if err != sql.ErrNoRows {
			utils.Error(c, http.StatusInternalServerError, "Database error")
			return
		}

		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to process password")
			return
		}

		userID := utils.GenerateBinaryID()
		user := models.User{
			ID:       userID.String(),
			FullName: req.FullName,
			Email:    req.Email,
			Phone:    req.Phone,
			Password: hashedPassword,
			Role:     models.RoleCustomer,
		}

		if err := q.CreateUser(ctx, sqlc.CreateUserParams{
			ID: userID, FullName: user.FullName, Email: user.Email, Phone: user.Phone,
			Password: user.Password, Role: sqlc.UsersRoleCUSTOMER,
			Disabled: 0,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to create user")
			return
		}
		_ = q.MarkUserPasswordSet(ctx, userID)

		respondAuth(c, cfg, &user, http.StatusCreated, "Registration successful")
	}
}

// ForgotPassword godoc
// @Summary Request password reset
// @Description Send a password reset link to the user's email if the account exists
// @Tags Authentication
// @Accept json
// @Produce json
// @Param body body models.ForgotPasswordRequest true "Email address"
// @Success 200 {object} map[string]string
// @Router /auth/forgot-password [post]
func ForgotPassword(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ForgotPasswordRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		q := getStore(c).Queries()

		row, err := q.GetUserByEmail(ctx, req.Email)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				if pending, checkErr := isPendingBusinessEmail(ctx, q, req.Email); checkErr != nil {
					utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
					return
				} else if pending {
					utils.Error(c, http.StatusForbidden, errApplicationUnderReviewForEmail(normalizeEmail(req.Email)))
					return
				}
				utils.Success(c, gin.H{
					"message": "If an account exists with that email, password reset instructions have been sent.",
				})
				return
			}
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		if row.Disabled != 0 {
			utils.Success(c, gin.H{
				"message": "If an account exists with that email, password reset instructions have been sent.",
			})
			return
		}

		token := utils.GenerateID() + utils.GenerateID()
		expiresAt := time.Now().Add(1 * time.Hour)

		_ = q.InvalidateUserResetTokens(ctx, row.ID)
		if err := q.CreatePasswordResetToken(ctx, sqlc.CreatePasswordResetTokenParams{
			ID:        utils.GenerateBinaryID(),
			UserID:    row.ID,
			Token:     token,
			ExpiresAt: expiresAt,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		resetURL := email.BuildResetURL(cfg, token, false)
		mailer := email.NewMailer(cfg)
		if err := mailer.SendPasswordReset(row.Email, email.PasswordResetEmailData{
			FullName: row.FullName,
			ResetURL: resetURL,
		}); err != nil {
			log.Printf("password reset email failed for %s: %v", row.Email, err)
		}

		response := gin.H{
			"message": "If an account exists with that email, password reset instructions have been sent.",
		}
		if cfg.ServerEnv == "development" {
			response["resetToken"] = token
			response["resetUrl"] = resetURL
		}

		utils.Success(c, response)
	}
}

// ResetPassword godoc
// @Summary Reset password with token
// @Description Reset account password using a valid reset token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param body body models.ResetPasswordRequest true "Reset token and new password"
// @Success 200 {object} map[string]string
// @Router /auth/reset-password [post]
func ResetPassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ResetPasswordRequest
		if !bindJSON(c, &req) {
			return
		}

		ctx := c.Request.Context()
		st := getStore(c)
		q := st.Queries()

		resetToken, err := q.GetPasswordResetToken(ctx, req.Token)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				utils.Error(c, http.StatusBadRequest, "This reset link is invalid or has expired. Please request a new one.")
				return
			}
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		hashedPassword, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		tx, err := st.DB().SQL.BeginTx(ctx, nil)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}
		defer tx.Rollback()
		qtx := q.WithTx(tx)

		if err := qtx.UpdateUserPassword(ctx, sqlc.UpdateUserPasswordParams{
			ID:       resetToken.UserID,
			Password: hashedPassword,
		}); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}
		if err := qtx.MarkUserPasswordSet(ctx, resetToken.UserID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}
		if err := qtx.MarkPasswordResetTokenUsed(ctx, resetToken.ID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}
		if err := qtx.InvalidateUserResetTokens(ctx, resetToken.UserID); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}
		if err := tx.Commit(); err != nil {
			utils.Error(c, http.StatusInternalServerError, "Something went wrong. Please try again later.")
			return
		}

		utils.Success(c, gin.H{"message": "Your password has been reset. You can now sign in with your new password."})
	}
}

// GetCurrentUser godoc
// @Summary Get current user profile
// @Description Get authenticated user's profile information
// @Tags Authentication
// @Produce json
// @Security Bearer
// @Success 200 {object} models.User
// @Router /auth/me [get]
func GetCurrentUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := utils.ParseID(middleware.GetUserID(c))
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid user")
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		row, err := q.GetUserByID(ctx, userID)
		if handleNotFound(c, err, "User not found", "Failed to fetch user") {
			return
		}
		user := store.ToUser(row)
		user.Sanitize()

		var pendingApp *models.VendorApplication
		if app, err := q.GetPendingApplicationByUser(ctx, &userID); err == nil {
			converted := store.ToApplication(app)
			pendingApp = &converted
		} else if !errors.Is(err, sql.ErrNoRows) {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch application status")
			return
		}

		utils.Success(c, models.MeResponse{
			User:                     user,
			PendingVendorApplication: pendingApp,
		})
	}
}
