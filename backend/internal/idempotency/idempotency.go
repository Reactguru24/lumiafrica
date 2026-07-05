package idempotency

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"github.com/gin-gonic/gin"
)

const ttl = 24 * time.Hour

func hashKey(userID, clientKey string) string {
	sum := sha256.Sum256([]byte(userID + ":" + clientKey))
	return hex.EncodeToString(sum[:])
}

func hashBody(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

// WithKey deduplicates mutating requests. When a key is present, fn runs at most once;
// replays return the stored response. Returns true when the response was written.
func WithKey(
	c *gin.Context,
	q *sqlc.Queries,
	userID types.BinaryUUID,
	endpoint string,
	clientKey string,
	requestBody []byte,
	fn func() (status int, response interface{}, err error),
) bool {
	clientKey = strings.TrimSpace(clientKey)
	if clientKey == "" {
		status, resp, err := fn()
		if err != nil {
			utils.Error(c, status, err.Error())
			return true
		}
		c.JSON(status, resp)
		return true
	}

	ctx := c.Request.Context()
	keyHash := hashKey(userID.String(), clientKey)
	reqHash := hashBody(requestBody)

	existing, err := q.GetIdempotencyKey(ctx, keyHash)
	if err == nil {
		if existing.RequestHash != reqHash {
			utils.Error(c, http.StatusConflict, "Idempotency key reused with a different request")
			return true
		}
		if existing.CompletedAt.Valid && existing.ResponseBody != nil {
			code := http.StatusOK
			if existing.ResponseCode.Valid {
				code = int(existing.ResponseCode.Int16)
			}
			var body interface{}
			_ = json.Unmarshal(*existing.ResponseBody, &body)
			c.JSON(code, body)
			return true
		}
		utils.Error(c, http.StatusConflict, "Request already in progress")
		return true
	}
	if !errors.Is(err, sql.ErrNoRows) {
		utils.Error(c, http.StatusInternalServerError, "Idempotency check failed")
		return true
	}

	recordID := utils.GenerateBinaryID()
	if err := q.CreateIdempotencyKey(ctx, sqlc.CreateIdempotencyKeyParams{
		ID:          recordID,
		KeyHash:     keyHash,
		UserID:      userID,
		Endpoint:    endpoint,
		RequestHash: reqHash,
		ExpiresAt:   time.Now().Add(ttl),
	}); err != nil {
		return WithKey(c, q, userID, endpoint, clientKey, requestBody, fn)
	}

	rows, err := q.LockIdempotencyKey(ctx, recordID)
	if err != nil || rows == 0 {
		utils.Error(c, http.StatusConflict, "Request already in progress")
		return true
	}

	status, resp, fnErr := fn()
	if fnErr != nil {
		_ = q.DeleteIdempotencyKey(ctx, recordID)
		utils.Error(c, status, fnErr.Error())
		return true
	}

	bodyBytes, _ := json.Marshal(resp)
	raw := json.RawMessage(bodyBytes)
	_ = q.CompleteIdempotencyKey(ctx, sqlc.CompleteIdempotencyKeyParams{
		ResponseCode: sql.NullInt16{Int16: int16(status), Valid: true},
		ResponseBody: &raw,
		ID:           recordID,
	})
	c.JSON(status, resp)
	return true
}
