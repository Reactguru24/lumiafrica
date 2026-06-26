package handlers

import (
	"context"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/redis"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const homepageMaxProducts = 12

type HomepageCollectionResponse struct {
	Items []models.Product `json:"items"`
	Limit int              `json:"limit"`
}

type HomepageProductsResponse struct {
	Featured    []models.Product `json:"featured"`
	Trending    []models.Product `json:"trending"`
	Bestsellers []models.Product `json:"bestsellers"`
	NewArrivals []models.Product `json:"newArrivals"`
	Limit       int              `json:"limit"`
}

type homepageProductListFn func(context.Context, int32) ([]sqlc.Product, error)

func homepageCollectionLimit(c *gin.Context) int32 {
	limit := parseQuery(c, "limit", homepageMaxProducts)
	if limit < 1 {
		limit = homepageMaxProducts
	}
	if limit > homepageMaxProducts {
		limit = homepageMaxProducts
	}
	return int32(limit)
}

func fetchHomepageProducts(c *gin.Context, limit int32, list homepageProductListFn) ([]models.Product, error) {
	ctx := c.Request.Context()
	q := getStore(c).Queries()
	rows, err := list(ctx, limit)
	if err != nil {
		return nil, err
	}
	return store.LoadProducts(ctx, q, rows), nil
}

func fetchHomepageNewArrivals(c *gin.Context, limit int32) ([]models.Product, error) {
	q := getStore(c).Queries()
	ctx := c.Request.Context()
	rows, err := q.ListHomepageNewArrivalProducts(ctx, limit)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		rows, err = q.ListHomepageRecentProducts(ctx, limit)
		if err != nil {
			return nil, err
		}
	}
	return store.LoadProducts(ctx, q, rows), nil
}

func serveHomepageCollection(c *gin.Context, collection string, list homepageProductListFn, errMsg string) {
	limit := homepageCollectionLimit(c)
	rc := getRedis(c)
	ctx := c.Request.Context()
	cacheKey := redis.HomepageCacheKey(collection, limit)

	var cached HomepageCollectionResponse
	if found, err := rc.GetJSON(ctx, cacheKey, &cached); err == nil && found {
		utils.Success(c, cached)
		return
	}

	items, err := fetchHomepageProducts(c, limit, list)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, errMsg)
		return
	}
	resp := HomepageCollectionResponse{Items: items, Limit: int(limit)}
	_ = rc.SetJSON(ctx, cacheKey, resp, 2*time.Minute)
	utils.Success(c, resp)
}

func serveHomepageCollectionByName(c *gin.Context, collection string) bool {
	q := getStore(c).Queries()
	switch collection {
	case "featured":
		serveHomepageCollection(c, "featured", q.ListHomepageFeaturedProducts, "Failed to fetch featured products")
	case "trending":
		serveHomepageCollection(c, "trending", q.ListHomepageTrendingProducts, "Failed to fetch trending products")
	case "bestsellers":
		serveHomepageCollection(c, "bestsellers", q.ListHomepageBestsellerProducts, "Failed to fetch bestseller products")
	case "new-arrivals":
		limit := homepageCollectionLimit(c)
		rc := getRedis(c)
		ctx := c.Request.Context()
		cacheKey := redis.HomepageCacheKey("new-arrivals", limit)

		var cached HomepageCollectionResponse
		if found, err := rc.GetJSON(ctx, cacheKey, &cached); err == nil && found {
			utils.Success(c, cached)
			return true
		}

		items, err := fetchHomepageNewArrivals(c, limit)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch new arrival products")
			return true
		}
		resp := HomepageCollectionResponse{Items: items, Limit: int(limit)}
		_ = rc.SetJSON(ctx, cacheKey, resp, 2*time.Minute)
		utils.Success(c, resp)
	default:
		utils.Error(c, http.StatusBadRequest, "Invalid collection; use featured, trending, bestsellers, or new-arrivals")
		return true
	}
	return true
}

// GetHomepageProducts godoc
// @Summary Get homepage product collections
// @Description Returns all homepage collections, or a single collection when `collection` is set (featured, trending, bestsellers, new-arrivals).
// @Tags Guest
// @Produce json
// @Param limit query int false "Max products per collection (default 12, max 12)"
// @Param collection query string false "Single collection to return" Enums(featured,trending,bestsellers,new-arrivals)
// @Success 200 {object} handlers.HomepageProductsResponse
// @Router /products/homepage [get]
func GetHomepageProducts() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := homepageCollectionLimit(c)
		if collection := strings.TrimSpace(c.Query("collection")); collection != "" {
			serveHomepageCollectionByName(c, collection)
			return
		}

		rc := getRedis(c)
		ctx := c.Request.Context()
		cacheKey := redis.HomepageCacheKey("all", limit)

		var cached HomepageProductsResponse
		if found, err := rc.GetJSON(ctx, cacheKey, &cached); err == nil && found {
			utils.Success(c, cached)
			return
		}

		q := getStore(c).Queries()

		featured, err := fetchHomepageProducts(c, limit, q.ListHomepageFeaturedProducts)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch featured products")
			return
		}
		trending, err := fetchHomepageProducts(c, limit, q.ListHomepageTrendingProducts)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch trending products")
			return
		}
		bestsellers, err := fetchHomepageProducts(c, limit, q.ListHomepageBestsellerProducts)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch bestseller products")
			return
		}
		newArrivals, err := fetchHomepageNewArrivals(c, limit)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "Failed to fetch new arrival products")
			return
		}

		resp := HomepageProductsResponse{
			Featured:    featured,
			Trending:    trending,
			Bestsellers: bestsellers,
			NewArrivals: newArrivals,
			Limit:       int(limit),
		}
		_ = rc.SetJSON(ctx, cacheKey, resp, 2*time.Minute)
		utils.Success(c, resp)
	}
}
