package handlers

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/email"
	"github.com/Reactguru24/lumiafrica/internal/utils"

	"github.com/gin-gonic/gin"
)

var (
	ErrBusinessEmailNotVendor = errors.New("business email belongs to a non-vendor account")
	ErrVendorAccountExists    = errors.New("vendor account already exists for business email")
)

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func errApplicationUnderReviewForEmail(email string) string {
	return "A vendor application with " + email + " is under review. You cannot register, sign in, or reset a password for this email until the application is decided."
}

func isPendingBusinessEmail(ctx context.Context, q *sqlc.Queries, email string) (bool, error) {
	_, err := q.GetPendingApplicationByBusinessEmail(ctx, normalizeEmail(email))
	if err == nil {
		return true, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return false, err
}

func resolveVendorAccountUser(ctx context.Context, q *sqlc.Queries, app sqlc.VendorApplication) (types.BinaryUUID, error) {
	businessEmail := normalizeEmail(app.BusinessEmail)

	if existing, err := q.GetUserByEmail(ctx, businessEmail); err == nil {
		if existing.Role != sqlc.UsersRoleVENDOR {
			return types.BinaryUUID{}, ErrBusinessEmailNotVendor
		}
		if _, err := q.GetVendorByUserID(ctx, existing.ID); err == nil {
			return types.BinaryUUID{}, ErrVendorAccountExists
		}
		return existing.ID, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return types.BinaryUUID{}, err
	}

	placeholderPassword, err := utils.HashPassword(utils.GenerateID() + utils.GenerateID())
	if err != nil {
		return types.BinaryUUID{}, err
	}

	vendorUserID := utils.GenerateBinaryID()
	fullName := strings.TrimSpace(app.ApplicantName)
	if fullName == "" && app.UserID != nil && !app.UserID.IsZero() {
		if user, err := q.GetUserByID(ctx, *app.UserID); err == nil {
			fullName = strings.TrimSpace(user.FullName)
		}
	}
	if fullName == "" {
		fullName = app.StoreName
	}

	if err := q.CreateUser(ctx, sqlc.CreateUserParams{
		ID:       vendorUserID,
		FullName: fullName,
		Email:    businessEmail,
		Phone:    app.ContactPhone,
		Password: placeholderPassword,
		Role:     sqlc.UsersRoleVENDOR,
		Disabled: 0,
	}); err != nil {
		return types.BinaryUUID{}, err
	}
	return vendorUserID, nil
}

type vendorActivationResult struct {
	Token    string
	ResetURL string
	Mailer   *email.Mailer
	SendErr  error
}

func sendVendorActivationEmail(
	ctx context.Context,
	cfg *config.Config,
	q *sqlc.Queries,
	vendorUserID types.BinaryUUID,
	businessEmail string,
	storeName string,
	applicantEmail string,
) (*vendorActivationResult, error) {
	token := utils.GenerateID() + utils.GenerateID()
	expiresAt := time.Now().Add(24 * time.Hour)
	_ = q.InvalidateUserResetTokens(ctx, vendorUserID)
	if err := q.CreatePasswordResetToken(ctx, sqlc.CreatePasswordResetTokenParams{
		ID:        utils.GenerateBinaryID(),
		UserID:    vendorUserID,
		Token:     token,
		ExpiresAt: expiresAt,
	}); err != nil {
		return nil, err
	}

	resetURL := email.BuildResetURL(cfg, token, true)
	mailer := email.NewMailer(cfg)
	sendErr := mailer.SendVendorApproved(businessEmail, email.VendorApprovedEmailData{
		StoreName:        storeName,
		ApplicantEmail:   applicantEmail,
		VendorLoginEmail: normalizeEmail(businessEmail),
		ResetURL:         resetURL,
	})

	if sendErr != nil {
		log.Printf("vendor activation email failed for %s: %v", businessEmail, sendErr)
	}

	return &vendorActivationResult{
		Token:    token,
		ResetURL: resetURL,
		Mailer:   mailer,
		SendErr:  sendErr,
	}, nil
}

func vendorAccountActivated(ctx context.Context, q *sqlc.Queries, user sqlc.User) bool {
	return user.PasswordSetAt.Valid
}

func vendorActivationResponse(cfg *config.Config, result *vendorActivationResult, sentMessage, skippedMessage string) gin.H {
	response := gin.H{"message": sentMessage}
	if result != nil && result.ResetURL != "" && (result.Mailer == nil || result.SendErr != nil || cfg.SMTPHost == "") {
		response["message"] = skippedMessage
		response["activationUrl"] = result.ResetURL
	}
	return response
}

func applicantEmailForVendor(ctx context.Context, q *sqlc.Queries, businessEmail string) (string, error) {
	app, err := q.GetApprovedApplicationByBusinessEmail(ctx, businessEmail)
	if err != nil {
		return "", err
	}
	if app.UserID != nil && !app.UserID.IsZero() {
		applicant, err := q.GetUserByID(ctx, *app.UserID)
		if err != nil {
			return "", err
		}
		return applicant.Email, nil
	}
	return normalizeEmail(app.BusinessEmail), nil
}
