package middleware

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

func jwtSigningKey(secret string) jwt.Keyfunc {
	return func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	}
}
