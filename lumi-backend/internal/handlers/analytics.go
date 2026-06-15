package handlers

import (
	"database/sql"
	"encoding/json"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type VendorAnalytics struct {
	TotalSales       int64              `json:"total_sales"`
	TotalOrders      int64              `json:"total_orders"`
	TotalRevenue     float64            `json:"total_revenue"`
	TotalProducts    int64              `json:"total_products"`
	TotalCustomers   int64              `json:"total_customers"`
	AverageRating    float64            `json:"average_rating"`
	TotalReviews     int64              `json:"total_reviews"`
	SalesTrend       []SalesDataPoint   `json:"sales_trend"`
	TopProducts      []ProductAnalytics `json:"top_products"`
	LowStockProducts []models.Product   `json:"low_stock_products"`
	OutOfStockCount  int64              `json:"out_of_stock_count"`

	Revenue             float64            `json:"revenue"`
	TotalOrdersClient   int64              `json:"totalOrders"`
	TotalProductsClient int64              `json:"totalProducts"`
	Customers           int64              `json:"customers"`
	SalesTrendClient    []SalesDataPoint   `json:"salesTrend"`
	TopProductsClient   []ProductAnalytics `json:"topProducts"`
	LowStock            []models.Product   `json:"lowStock"`
	OutOfStock          []models.Product   `json:"outOfStock"`
}

type AdminAnalytics struct {
	TotalUsers    int64              `json:"total_users"`
	TotalVendors  int64              `json:"total_vendors"`
	TotalProducts int64              `json:"total_products"`
	TotalOrders   int64              `json:"total_orders"`
	TotalRevenue  float64            `json:"total_revenue"`
	MonthlySales  []SalesDataPoint   `json:"monthly_sales"`
	VendorGrowth  []GrowthDataPoint  `json:"vendor_growth"`
	OrderTrends   []OrderTrendPoint  `json:"order_trends"`
	RecentOrders  []models.Order     `json:"recent_orders"`
	TopVendors    []VendorStats      `json:"top_vendors"`
	TopProducts   []ProductAnalytics `json:"top_products"`

	TotalUsersCamel    int64             `json:"totalUsers"`
	TotalVendorsCamel  int64             `json:"totalVendors"`
	TotalProductsCamel int64             `json:"totalProducts"`
	TotalOrdersCamel   int64             `json:"totalOrders"`
	TotalRevenueCamel  float64           `json:"totalRevenue"`
	MonthlySalesCamel  []SalesDataPoint  `json:"monthlySales"`
	VendorGrowthCamel  []GrowthDataPoint `json:"vendorGrowth"`
	OrderTrendsCamel   []OrderTrendPoint `json:"orderTrends"`
}

type SalesDataPoint struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
	Sales   int64   `json:"sales"`
}

type GrowthDataPoint struct {
	Month string `json:"month"`
	Count int64  `json:"count"`
}

type OrderTrendPoint struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type ProductAnalytics struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Sales       int64   `json:"sales"`
	Revenue     float64 `json:"revenue"`
	Rating      float64 `json:"rating"`
	ReviewCount int64   `json:"review_count"`
	Stock       int     `json:"stock"`
}

type VendorStats struct {
	ID           string  `json:"id"`
	StoreName    string  `json:"store_name"`
	TotalSales   float64 `json:"total_sales"`
	Orders       int64   `json:"orders"`
	Rating       float64 `json:"rating"`
	ProductCount int64   `json:"product_count"`
}

// GetVendorAnalytics godoc
// @Summary Get vendor analytics
// @Description Get analytics dashboard data for the vendor
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Success 200 {object} handlers.VendorAnalytics
// @Router /vendor/analytics [get]
func GetVendorAnalytics() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID, ok := getVendorID(c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		startDate := utils.ParsePeriod(c.DefaultQuery("period", "30days"))

		analytics := VendorAnalytics{}
		products, _ := q.ListProductsByVendor(ctx, vendorID)
		analytics.TotalProducts = int64(len(products))

		var since sql.NullTime
		if !startDate.IsZero() {
			since = sql.NullTime{Time: startDate, Valid: true}
		}
		orders, _ := q.ListOrdersSince(ctx, sqlc.ListOrdersSinceParams{Since: since})
		customerIDs := map[string]struct{}{}
		productSales := make(map[string]ProductAnalytics, len(products))
		productLookup := make(map[string]models.Product, len(products))

		for _, p := range products {
			prod := store.ToProduct(p)
			productLookup[p.ID] = prod
			productSales[p.ID] = ProductAnalytics{
				ID: prod.ID, Name: prod.Name, Rating: prod.Rating,
				ReviewCount: int64(prod.ReviewCount), Stock: prod.Stock,
			}
		}

		for _, order := range orders {
			analytics.TotalOrders++
			analytics.TotalRevenue += parseDecimal(order.Total)
			customerIDs[order.UserID] = struct{}{}
			for _, item := range decodeOrderItems(order.Items) {
				if item.VendorID != vendorID {
					continue
				}
				point := productSales[item.ProductID]
				if point.ID == "" {
					continue
				}
				point.Sales += int64(item.Quantity)
				point.Revenue += item.Price * float64(item.Quantity)
				productSales[item.ProductID] = point
			}
		}

		analytics.TotalSales = analytics.TotalOrders
		analytics.Revenue = analytics.TotalRevenue
		analytics.TotalOrdersClient = analytics.TotalOrders
		analytics.TotalProductsClient = analytics.TotalProducts
		analytics.TotalCustomers = int64(len(customerIDs))
		analytics.Customers = analytics.TotalCustomers

		topProducts := make([]ProductAnalytics, 0, len(productSales))
		for _, point := range productSales {
			if point.Sales > 0 || point.Revenue > 0 || point.ReviewCount > 0 {
				topProducts = append(topProducts, point)
			}
		}
		sort.Slice(topProducts, func(i, j int) bool {
			if topProducts[i].Sales == topProducts[j].Sales {
				return topProducts[i].Revenue > topProducts[j].Revenue
			}
			return topProducts[i].Sales > topProducts[j].Sales
		})
		if len(topProducts) > 5 {
			topProducts = topProducts[:5]
		}

		lowStock, _ := q.ListLowStockByVendor(ctx, vendorID)
		outOfStock := make([]models.Product, 0)
		for _, p := range products {
			prod := store.ToProduct(p)
			if prod.Stock == 0 {
				outOfStock = append(outOfStock, prod)
			}
		}

		analytics.SalesTrendClient = buildSalesTrend(orders, vendorID, 6)
		analytics.TopProductsClient = topProducts
		analytics.LowStockProducts = store.ToProducts(lowStock)
		analytics.OutOfStockCount = int64(len(outOfStock))
		analytics.LowStock = analytics.LowStockProducts
		analytics.OutOfStock = outOfStock

		utils.Success(c, analytics)
	}
}

// GetAdminAnalytics godoc
// @Summary Get admin analytics
// @Description Get analytics dashboard data for the admin
// @Tags Admin
// @Produce json
// @Security Bearer
// @Success 200 {object} handlers.AdminAnalytics
// @Router /admin/analytics [get]
func GetAdminAnalytics() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		startDate := utils.ParsePeriod(c.DefaultQuery("period", "30days"))

		analytics := AdminAnalytics{}
		analytics.TotalUsers, _ = q.CountCustomers(ctx)
		analytics.TotalVendors, _ = q.CountAllVendors(ctx)
		analytics.TotalProducts, _ = q.CountAllProducts(ctx)
		analytics.TotalUsersCamel = analytics.TotalUsers
		analytics.TotalVendorsCamel = analytics.TotalVendors
		analytics.TotalProductsCamel = analytics.TotalProducts

		var since sql.NullTime
		if !startDate.IsZero() {
			since = sql.NullTime{Time: startDate, Valid: true}
		}
		orders, _ := q.ListOrdersSince(ctx, sqlc.ListOrdersSinceParams{Since: since})
		analytics.TotalOrders = int64(len(orders))
		for _, order := range orders {
			analytics.TotalRevenue += parseDecimal(order.Total)
		}
		analytics.TotalOrdersCamel = analytics.TotalOrders
		analytics.TotalRevenueCamel = analytics.TotalRevenue

		analytics.MonthlySales = buildMonthlySales(orders, 12)
		analytics.VendorGrowth = buildVendorGrowth(analytics.TotalVendors, 6)
		analytics.OrderTrends = buildOrderTrends(orders, c.DefaultQuery("period", "30days"))
		analytics.MonthlySalesCamel = analytics.MonthlySales
		analytics.VendorGrowthCamel = analytics.VendorGrowth
		analytics.OrderTrendsCamel = analytics.OrderTrends
		recent, _ := q.ListRecentOrders(ctx, 10)
		analytics.RecentOrders = store.ToOrders(recent)

		topVendors, _ := q.ListTopVendorsForAnalytics(ctx, 5)
		analytics.TopVendors = make([]VendorStats, len(topVendors))
		for i, v := range topVendors {
			vendor := store.ToVendor(v)
			analytics.TopVendors[i] = VendorStats{
				ID: vendor.ID, StoreName: vendor.StoreName, TotalSales: vendor.TotalSales,
				Rating: vendor.Rating, ProductCount: int64(vendor.ProductCount),
			}
		}

		utils.Success(c, analytics)
	}
}

func parseDecimal(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func buildMonthlySales(orders []sqlc.Order, count int) []SalesDataPoint {
	points := make([]SalesDataPoint, count)
	monthNames := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -(count - 1), 0)
	for i := range points {
		month := start.AddDate(0, i, 0)
		points[i] = SalesDataPoint{Month: monthNames[month.Month()-1]}
	}
	for _, order := range orders {
		createdAt := orderCreatedAt(order)
		if createdAt.Before(start) || createdAt.After(now) {
			continue
		}
		index := int(createdAt.Sub(start).Hours() / (24 * 30))
		if index < 0 || index >= count {
			continue
		}
		points[index].Revenue += parseDecimal(order.Total)
		points[index].Orders++
	}
	return points
}

func buildSalesTrend(orders []sqlc.Order, vendorID string, count int) []SalesDataPoint {
	points := make([]SalesDataPoint, count)
	monthNames := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -(count - 1), 0)
	for i := range points {
		month := start.AddDate(0, i, 0)
		points[i] = SalesDataPoint{Month: monthNames[month.Month()-1]}
	}
	for _, order := range orders {
		createdAt := orderCreatedAt(order)
		if createdAt.Before(start) || createdAt.After(now) {
			continue
		}
		index := int(createdAt.Sub(start).Hours() / (24 * 30))
		if index < 0 || index >= count {
			continue
		}
		for _, item := range decodeOrderItems(order.Items) {
			if item.VendorID != vendorID {
				continue
			}
			points[index].Sales += int64(item.Quantity)
			points[index].Revenue += item.Price * float64(item.Quantity)
			points[index].Orders++
		}
	}
	return points
}

func buildVendorGrowth(totalVendors, count int64) []GrowthDataPoint {
	growth := make([]GrowthDataPoint, count)
	monthNames := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun"}
	for i := range growth {
		growth[i] = GrowthDataPoint{
			Month: monthNames[i],
			Count: totalVendors * int64(i+1) / int64(count),
		}
	}
	return growth
}

func buildOrderTrends(orders []sqlc.Order, period string) []OrderTrendPoint {
	days := 30
	switch period {
	case "7days":
		days = 7
	case "90days":
		days = 90
	case "all":
		days = 30
	}
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -(days - 1))
	trends := make([]OrderTrendPoint, days)
	for i := range trends {
		day := start.AddDate(0, 0, i)
		trends[i] = OrderTrendPoint{Date: day.Format("2006-01-02")}
	}
	for _, order := range orders {
		createdAt := orderCreatedAt(order)
		if createdAt.Before(start) || createdAt.After(now) {
			continue
		}
		index := int(createdAt.Sub(start).Hours() / 24)
		if index >= 0 && index < days {
			trends[index].Count++
		}
	}
	return trends
}

func decodeOrderItems(raw json.RawMessage) []models.OrderItem {
	var items []models.OrderItem
	_ = json.Unmarshal(raw, &items)
	return items
}

func orderCreatedAt(order sqlc.Order) time.Time {
	if order.CreatedAt.Valid {
		return order.CreatedAt.Time
	}
	return time.Now()
}
