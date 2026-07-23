package handlers

import (
	"context"
	"database/sql"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
	"github.com/Reactguru24/lumiafrica/internal/store"
	"github.com/Reactguru24/lumiafrica/internal/utils"
	"net/http"
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

	AverageOrderValue    float64              `json:"average_order_value"`
	OrderStatusBreakdown []StatusBreakdown    `json:"order_status_breakdown"`
	CategorySales        []CategorySales      `json:"category_sales"`
	PaymentMethods       []PaymentMethodStats `json:"payment_methods"`
	PayoutHistory        []PayoutHistory      `json:"payout_history"`
	DailyTrend           []OrderTrendPoint    `json:"daily_trend"`
	TotalRefunds         float64              `json:"total_refunds"`
}

type StatusBreakdown struct {
	Status      string  `json:"status"`
	Count       int64   `json:"count"`
	TotalAmount float64 `json:"total_amount"`
}

type CategorySales struct {
	Category string  `json:"category"`
	Slug     string  `json:"slug"`
	Units    float64 `json:"units"`
	Revenue  float64 `json:"revenue"`
	Orders   int64   `json:"orders"`
}

type PaymentMethodStats struct {
	PaymentMethod string  `json:"payment_method"`
	Orders        int64   `json:"orders"`
	Amount        float64 `json:"amount"`
}

type PayoutHistory struct {
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	Reference   *string   `json:"reference"`
	CreatedAt   time.Time `json:"created_at"`
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
// @Summary Get vendor analytics dashboard
// @Description Returns sales, revenue, top products, and stock alerts for the signed-in vendor.
// @Tags Vendor
// @Produce json
// @Security Bearer
// @Param period query string false "Time period" Enums(7days,30days,90days,1year,all)
// @Success 200 {object} handlers.VendorAnalytics
// @Router /vendor/analytics [get]
func GetVendorAnalytics() gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorIDStr, ok := getVendorID(c)
		if !ok {
			return
		}
		vendorID, err := utils.ParseID(vendorIDStr)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, "Invalid vendor")
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
		orders, _ := q.ListOrdersByVendorSince(ctx, sqlc.ListOrdersByVendorSinceParams{
			VendorID: vendorID,
			Since:    since,
		})
		customerIDs := map[string]struct{}{}
		productSales := make(map[string]ProductAnalytics, len(products))

		for _, p := range products {
			prod := store.ToProduct(p)
			productSales[p.ID.String()] = ProductAnalytics{
				ID: prod.ID, Name: prod.Name, Rating: prod.Rating,
				ReviewCount: int64(prod.ReviewCount), Stock: prod.Stock,
			}
		}

		for _, order := range orders {
			items, _ := q.ListOrderItemsByOrder(ctx, order.ID)
			var orderRevenue float64
			var hasVendorItems bool
			for _, item := range items {
				if item.VendorID != vendorID {
					continue
				}
				hasVendorItems = true
				lineTotal := store.ParseDecimalString(item.Subtotal)
				orderRevenue += lineTotal
				productID := item.ProductID.String()
				point := productSales[productID]
				if point.ID == "" {
					continue
				}
				point.Sales += int64(item.Quantity)
				point.Revenue += lineTotal
				productSales[productID] = point
			}
			if !hasVendorItems {
				continue
			}
			analytics.TotalOrders++
			analytics.TotalRevenue += orderRevenue
			customerIDs[order.UserID.String()] = struct{}{}
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

		analytics.SalesTrendClient = buildSalesTrend(ctx, q, orders, vendorID, 6)
		analytics.TopProductsClient = topProducts
		analytics.LowStockProducts = store.ToProducts(lowStock)
		analytics.OutOfStockCount = int64(len(outOfStock))
		analytics.LowStock = analytics.LowStockProducts
		analytics.OutOfStock = outOfStock

		if analytics.TotalOrders > 0 {
			analytics.AverageOrderValue = analytics.TotalRevenue / float64(analytics.TotalOrders)
		}

		statusRows, _ := q.VendorOrderStatusCounts(ctx, sqlc.VendorOrderStatusCountsParams{
			VendorID:    vendorID,
			Column2:     since,
			CreatedAt:   startDate,
			Column4:     since,
			CreatedAt_2: time.Now(),
		})
		breakdown := make([]StatusBreakdown, 0, len(statusRows))
		for _, row := range statusRows {
			breakdown = append(breakdown, StatusBreakdown{
				Status:      string(row.Status),
				Count:       row.Count,
				TotalAmount: parseFloat(row.TotalAmount),
			})
		}
		analytics.OrderStatusBreakdown = breakdown

		var endDate sql.NullTime
		if !startDate.IsZero() {
			endDate = sql.NullTime{Time: time.Now(), Valid: true}
		}

		categoryRows, _ := q.VendorCategorySales(ctx, sqlc.VendorCategorySalesParams{
			VendorID:    vendorID,
			Column2:     since,
			CreatedAt:   startDate,
			Column4:     endDate,
			CreatedAt_2: time.Now(),
		})
		for _, row := range categoryRows {
			analytics.CategorySales = append(analytics.CategorySales, CategorySales{
				Category: row.Category,
				Slug:     row.Slug,
				Units:    parseFloat(row.Units),
				Revenue:  parseFloat(row.Revenue),
				Orders:   row.Orders,
			})
		}

		paymentRows, _ := q.VendorPaymentMethodStats(ctx, sqlc.VendorPaymentMethodStatsParams{
			VendorID:    vendorID,
			Column2:     since,
			CreatedAt:   startDate,
			Column4:     endDate,
			CreatedAt_2: time.Now(),
		})
		for _, row := range paymentRows {
			analytics.PaymentMethods = append(analytics.PaymentMethods, PaymentMethodStats{
				PaymentMethod: row.PaymentMethod,
				Orders:        row.Orders,
				Amount:        parseFloat(row.Amount),
			})
		}

		payoutRows, _ := q.VendorPayoutHistory(ctx, sqlc.VendorPayoutHistoryParams{
			VendorID: vendorID,
			Limit:    12,
		})
		for _, row := range payoutRows {
			ref := ""
			if row.Reference.Valid {
				ref = row.Reference.String
			}
			analytics.PayoutHistory = append(analytics.PayoutHistory, PayoutHistory{
				PeriodStart: row.PeriodStart,
				PeriodEnd:   row.PeriodEnd,
				Amount:      parseFloat(row.Amount),
				Status:      string(row.Status),
				Reference:   &ref,
				CreatedAt:   row.CreatedAt,
			})
		}
		if len(payoutRows) > 12 {
			analytics.PayoutHistory = analytics.PayoutHistory[:12]
		}

		if !startDate.IsZero() {
			dailyRows, _ := q.VendorDailyAnalytics(ctx, sqlc.VendorDailyAnalyticsParams{
				VendorID:     vendorID,
				Column2:      since,
				PeriodDate:   startDate,
				Column4:      endDate,
				PeriodDate_2: time.Now(),
			})
			for _, row := range dailyRows {
				dateStr := row.PeriodDate.Format("2006-01-02")
				analytics.DailyTrend = append(analytics.DailyTrend, OrderTrendPoint{
					Date:  dateStr,
					Count: int64(row.Orders),
				})
				analytics.TotalRefunds += parseFloat(row.Refunds)
			}
			reverseSlice(analytics.DailyTrend)
		}

		vendorRow, _ := q.GetVendorByID(ctx, vendorID)
		vendor := store.ToVendor(vendorRow)
		analytics.AverageRating = vendor.Rating
		analytics.TotalReviews, _ = q.CountReviewsByVendor(ctx, vendorID)

		utils.Success(c, analytics)
	}
}

// GetAdminAnalytics godoc
// @Summary Get platform analytics dashboard
// @Description Returns platform-wide metrics, trends, and top performers.
// @Tags Admin
// @Produce json
// @Security Bearer
// @Param period query string false "Time period" Enums(7days,30days,90days,1year,all)
// @Success 200 {object} handlers.AdminAnalytics
// @Router /admin/analytics [get]
func GetAdminAnalytics() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		q := getStore(c).Queries()
		startDate := utils.ParsePeriod(c.DefaultQuery("period", "30days"))

		analytics := AdminAnalytics{}
		analytics.TotalUsers, _ = q.CountUsers(ctx)
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
		vendorRows, _ := q.ListVendorsAdmin(ctx, sqlc.ListVendorsAdminParams{Limit: 10000, Offset: 0})
		vendorDates := make([]time.Time, len(vendorRows))
		for i, v := range vendorRows {
			vendorDates[i] = v.CreatedAt
		}
		analytics.VendorGrowth = buildVendorGrowthFromDates(vendorDates, 6)
		analytics.OrderTrends = buildOrderTrends(orders, c.DefaultQuery("period", "30days"))
		analytics.MonthlySalesCamel = analytics.MonthlySales
		analytics.VendorGrowthCamel = analytics.VendorGrowth
		analytics.OrderTrendsCamel = analytics.OrderTrends
		recent, _ := q.ListRecentOrders(ctx, 10)
		analytics.RecentOrders = store.LoadOrders(ctx, q, recent)

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
		createdAt := order.CreatedAt
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

func buildSalesTrend(ctx context.Context, q *sqlc.Queries, orders []sqlc.Order, vendorID types.BinaryUUID, count int) []SalesDataPoint {
	points := make([]SalesDataPoint, count)
	monthNames := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -(count - 1), 0)
	for i := range points {
		month := start.AddDate(0, i, 0)
		points[i] = SalesDataPoint{Month: monthNames[month.Month()-1]}
	}
	for _, order := range orders {
		createdAt := order.CreatedAt
		if createdAt.Before(start) || createdAt.After(now) {
			continue
		}
		index := int(createdAt.Sub(start).Hours() / (24 * 30))
		if index < 0 || index >= count {
			continue
		}
		orderCounted := false
		items, _ := q.ListOrderItemsByOrder(ctx, order.ID)
		for _, item := range items {
			if item.VendorID != vendorID {
				continue
			}
			points[index].Sales += int64(item.Quantity)
			points[index].Revenue += store.ParseDecimalString(item.Subtotal)
			if !orderCounted {
				points[index].Orders++
				orderCounted = true
			}
		}
	}
	return points
}

func buildVendorGrowthFromDates(dates []time.Time, count int) []GrowthDataPoint {
	growth := make([]GrowthDataPoint, count)
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -(count - 1), 0)
	for i := range growth {
		month := start.AddDate(0, i, 0)
		growth[i] = GrowthDataPoint{Month: month.Format("Jan")}
	}
	for _, createdAt := range dates {
		if createdAt.Before(start) {
			for i := range growth {
				growth[i].Count++
			}
			continue
		}
		if createdAt.After(now) {
			continue
		}
		index := int(createdAt.Sub(start).Hours() / (24 * 30))
		if index < 0 {
			for i := range growth {
				growth[i].Count++
			}
			continue
		}
		if index >= count {
			index = count - 1
		}
		for i := index; i < count; i++ {
			growth[i].Count++
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
		createdAt := order.CreatedAt
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

func parseFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case []byte:
		f, _ := strconv.ParseFloat(string(val), 64)
		return f
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	case int64:
		return float64(val)
	}
	return 0
}

func reverseSlice[T any](s []T) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}
