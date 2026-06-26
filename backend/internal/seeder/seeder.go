package seeder

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"lumi-backend/internal/catalog"
	"lumi-backend/internal/cron"
	"lumi-backend/internal/database"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
)

func SeedAll(db *database.DB) error {
	log.Println("Starting database seeding...")

	if err := seedCategories(db); err != nil {
		return fmt.Errorf("seed categories: %w", err)
	}
	if err := seedUsers(db); err != nil {
		return fmt.Errorf("seed users: %w", err)
	}
	if err := seedAddresses(db); err != nil {
		return fmt.Errorf("seed addresses: %w", err)
	}
	if err := seedVendors(db); err != nil {
		return fmt.Errorf("seed vendors: %w", err)
	}
	if err := seedProducts(db); err != nil {
		return fmt.Errorf("seed products: %w", err)
	}
	if err := seedOrders(db); err != nil {
		return fmt.Errorf("seed orders: %w", err)
	}
	if err := seedReviews(db); err != nil {
		return fmt.Errorf("seed reviews: %w", err)
	}
	if err := seedProductFeatureFlags(db); err != nil {
		return fmt.Errorf("seed product feature flags: %w", err)
	}
	if err := seedSubscriptions(db); err != nil {
		return fmt.Errorf("seed subscriptions: %w", err)
	}
	if err := seedVendorApplications(db); err != nil {
		return fmt.Errorf("seed vendor applications: %w", err)
	}
	if err := seedCommerce(db); err != nil {
		return fmt.Errorf("seed commerce: %w", err)
	}

	log.Println("Database seeding complete!")
	return nil
}

func seedCategories(db *database.DB) error {
	if err := catalog.EnsureTree(context.Background(), db.Q); err != nil {
		return err
	}
	log.Println("Ensured product category tree")
	return nil
}

func seedUsers(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	users := []struct {
		fullName string
		email    string
		phone    string
		password string
		role     sqlc.UsersRole
	}{
		{"Admin User", "admin@lumiafrica.com", "+254700000001", "admin123", sqlc.UsersRoleADMIN},
		{"Vendor User", "vendor@lumiafrica.com", "+254700000002", "vendor123", sqlc.UsersRoleVENDOR},
		{"Customer One", "customer@lumiafrica.com", "+254700000003", "customer123", sqlc.UsersRoleCUSTOMER},
		{"Customer Two", "customer2@lumiafrica.com", "+254700000004", "customer123", sqlc.UsersRoleCUSTOMER},
	}

	for _, u := range users {
		hashedPwd, err := utils.HashPassword(u.password)
		if err != nil {
			return err
		}

		existing, err := q.GetUserByEmail(ctx, u.email)
		if err == nil {
			if err := q.UpdateUserPassword(ctx, sqlc.UpdateUserPasswordParams{
				ID:       existing.ID,
				Password: hashedPwd,
			}); err != nil {
				return err
			}
			_ = q.MarkUserPasswordSet(ctx, existing.ID)
			log.Printf("User %s already exists — password reset to demo value", u.email)
			continue
		}

		userID := utils.GenerateBinaryID()
		if err := q.CreateUser(ctx, sqlc.CreateUserParams{
			ID:       userID,
			FullName: u.fullName,
			Email:    u.email,
			Phone:    u.phone,
			Password: hashedPwd,
			Role:     u.role,
			Disabled: 0,
		}); err != nil {
			return err
		}
		_ = q.MarkUserPasswordSet(ctx, userID)
		log.Printf("Created user: %s", u.email)
	}

	log.Println("Demo accounts:")
	log.Println("  admin    admin@lumiafrica.com    / admin123")
	log.Println("  vendor   vendor@lumiafrica.com   / vendor123")
	log.Println("  customer customer@lumiafrica.com / customer123")
	log.Println("  customer customer2@lumiafrica.com / customer123")

	return nil
}

func seedAddresses(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer: %w", err)
	}

	existing, _ := q.ListAddressesByUser(ctx, customer.ID)
	if len(existing) > 0 {
		log.Println("Addresses already exist, skipping")
		return nil
	}

	if err := q.CreateAddress(ctx, sqlc.CreateAddressParams{
		ID:        utils.GenerateBinaryID(),
		UserID:    customer.ID,
		Label:     "Home",
		Street:    "123 Main St",
		City:      "Nairobi",
		State:     "Nairobi",
		Country:   "Kenya",
		ZipCode:   "00100",
		IsDefault: 1,
	}); err != nil {
		return err
	}

	log.Println("Created address for customer")
	return nil
}

func seedVendors(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	vendorUsers := []struct {
		email     string
		storeName string
		slug      string
		country   string
		city      string
		logo      string
	}{
		{"vendor@lumiafrica.com", "Fashion Hub", "fashion-hub", "Kenya", "Nairobi", "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"},
	}

	for _, vu := range vendorUsers {
		user, err := q.GetUserByEmail(ctx, vu.email)
		if err != nil {
			return fmt.Errorf("get vendor user: %w", err)
		}

		exists, _ := q.GetVendorByUserID(ctx, user.ID)
		if !exists.ID.IsZero() {
			log.Printf("Vendor for %s already exists, skipping", vu.email)
			continue
		}

		vendorID := utils.GenerateBinaryID()
		if err := q.CreateVendor(ctx, sqlc.CreateVendorParams{
			ID:            vendorID,
			UserID:        user.ID,
			StoreName:     vu.storeName,
			Slug:          vu.slug,
			Description:   sql.NullString{String: "Curated East African fashion featuring menswear, womenswear, kids clothing, accessories, and activewear from verified local brands.", Valid: true},
			Logo:          vu.logo,
			Banner:        sql.NullString{String: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80", Valid: true},
			ContactPhone:  "+254700000002",
			BusinessEmail: vu.email,
			Country:       vu.country,
			City:          vu.city,
		}); err != nil {
			return err
		}

		for parentSlug := range catalog.Tree {
			parent, err := q.GetCategoryBySlug(ctx, parentSlug)
			if err != nil {
				return err
			}
			if err := q.InsertVendorCategory(ctx, sqlc.InsertVendorCategoryParams{
				VendorID:   vendorID,
				CategoryID: parent.ID,
			}); err != nil {
				return err
			}
		}

		if err := q.FeatureVendor(ctx, sqlc.FeatureVendorParams{
			IsFeatured: 1,
			ID:         vendorID,
		}); err != nil {
			return err
		}

		log.Printf("Created vendor: %s", vu.storeName)
	}

	return nil
}

func seedProducts(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	existing, _ := q.CountProductsByVendor(ctx, vendor.ID)
	if existing > 0 {
		log.Println("Products already exist, skipping")
		return nil
	}

	featuredSeedCount := 0
	for i, p := range productCatalog() {
		featured := p.featured && featuredSeedCount < models.ProductFeaturedLimit
		productID, err := createSeedProduct(ctx, q, vendor.ID, p, featured)
		if err != nil {
			return fmt.Errorf("create product %q: %w", p.name, err)
		}

		if !p.newArrival {
			if err := q.SetProductCreatedAt(ctx, sqlc.SetProductCreatedAtParams{
				CreatedAt: time.Now().AddDate(0, 0, -(8 + (i % 14))),
				ID:        productID,
			}); err != nil {
				return err
			}
		}

		if featured {
			featuredSeedCount++
		}

		if err := q.ModerateProduct(ctx, sqlc.ModerateProductParams{
			ID:     productID,
			Status: sqlc.ProductsStatusActive,
		}); err != nil {
			return err
		}

		log.Printf("Created product: %s", p.name)
	}

	return nil
}

func seedOrders(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer: %w", err)
	}

	existing, _ := q.ListOrdersByUser(ctx, sqlc.ListOrdersByUserParams{
		UserID: customer.ID,
		Limit:  10,
		Offset: 0,
	})
	if len(existing) > 0 {
		log.Println("Orders already exist, skipping")
		return nil
	}

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	products, err := q.ListProductsByVendor(ctx, vendor.ID)
	if err != nil {
		return fmt.Errorf("list products: %w", err)
	}
	if len(products) == 0 {
		return fmt.Errorf("no products available for orders")
	}

	addr := deliveryAddressJSON()

	for i, product := range products {
		variants, err := q.ListProductVariants(ctx, product.ID)
		if err != nil || len(variants) == 0 {
			return fmt.Errorf("list variants for %s: %w", product.Name, err)
		}
		firstVariant := variants[0]

		extraOrders := 0
		if i < 9 {
			extraOrders = 2
		}
		for j := 0; j <= extraOrders; j++ {
			subtotal := store.ParseDecimalString(product.MinPrice)
			shipping := 500.0
			total := subtotal + shipping

			orderID := utils.GenerateBinaryID()
			if err := q.CreateOrder(ctx, sqlc.CreateOrderParams{
				ID:              orderID,
				UserID:          customer.ID,
				Subtotal:        store.FloatToDecimalString(subtotal),
				DiscountAmount:  "0.00",
				ShippingCost:    store.FloatToDecimalString(shipping),
				TaxAmount:       "0.00",
				Total:           store.FloatToDecimalString(total),
				PaymentMethod:   "mpesa",
				DeliveryAddress: addr,
				Notes:           sql.NullString{String: "Demo order for seeded marketplace data", Valid: true},
			}); err != nil {
				return err
			}

			if err := createSeedOrderItem(ctx, q, orderID, product.ID, firstVariant.Size, firstVariant.Color, 1); err != nil {
				return err
			}

			orderTime := time.Now().Add(-time.Duration(i*3+j) * time.Hour)
			if err := q.SetOrderTimestamps(ctx, sqlc.SetOrderTimestampsParams{
				CreatedAt: orderTime,
				UpdatedAt: orderTime,
				ID:        orderID,
			}); err != nil {
				return err
			}
		}
	}

	log.Println("Created demo orders for seeded products")
	return nil
}

func seedReviews(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer: %w", err)
	}

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	reviewCount, _ := q.CountReviewsByVendor(ctx, vendor.ID)
	if reviewCount > 0 {
		log.Println("Reviews already exist, skipping")
		return nil
	}

	products, err := q.ListProductsByVendor(ctx, vendor.ID)
	if err != nil {
		return fmt.Errorf("list products: %w", err)
	}
	if len(products) == 0 {
		return fmt.Errorf("no products available for reviews")
	}

	orders, err := q.ListOrdersByUser(ctx, sqlc.ListOrdersByUserParams{
		UserID: customer.ID,
		Limit:  200,
		Offset: 0,
	})
	if err != nil || len(orders) == 0 {
		return fmt.Errorf("get orders: %w", err)
	}

	customerTwo, customerTwoErr := getUserByEmail(db, "customer2@lumiafrica.com")

	for i, product := range products {
		reviewers := []struct {
			userID types.BinaryUUID
			j      int
		}{{userID: customer.ID, j: 0}}
		if customerTwoErr == nil && i%3 == 0 {
			reviewers = append(reviewers, struct {
				userID types.BinaryUUID
				j      int
			}{userID: customerTwo.ID, j: 1})
		}

		created := 0
		for _, reviewer := range reviewers {
			if _, err := q.GetReviewByProductAndUser(ctx, sqlc.GetReviewByProductAndUserParams{
				ProductID: product.ID,
				UserID:    reviewer.userID,
			}); err == nil {
				continue
			}

			order := orders[(i+reviewer.j)%len(orders)]
			if err := q.CreateReview(ctx, sqlc.CreateReviewParams{
				ID:        utils.GenerateBinaryID(),
				ProductID: product.ID,
				VendorID:  vendor.ID,
				UserID:    reviewer.userID,
				OrderID:   &order.ID,
				Rating:    reviewRatingForProduct(i, reviewer.j),
				Comment:   reviewCommentForProduct(i, reviewer.j),
			}); err != nil {
				return err
			}
			created++
		}

		rating := 4.1 + float64(i%5)*0.15
		reviewCountValue := created
		if i < 9 {
			rating = 4.6 + float64(i%4)*0.1
			if reviewCountValue == 0 {
				reviewCountValue = 1
			}
		}
		if reviewCountValue == 0 {
			continue
		}
		if err := q.UpdateProductRating(ctx, sqlc.UpdateProductRatingParams{
			ID:          product.ID,
			Rating:      store.FloatToDecimalString(rating),
			ReviewCount: int32(reviewCountValue),
		}); err != nil {
			return err
		}
	}

	if err := refreshVendorRating(ctx, q, vendor.ID); err != nil {
		return err
	}

	log.Println("Created reviews and refreshed product ratings")
	return nil
}

func seedProductFeatureFlags(db *database.DB) error {
	ctx := context.Background()
	log.Println("Refreshing seeded product feature flags...")
	if err := cron.RefreshProductFlags(ctx, db.Q); err != nil {
		return err
	}

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	products, err := db.Q.ListVendorProducts(ctx, sqlc.ListVendorProductsParams{
		VendorID: vendor.ID,
		Limit:    models.ProductFeaturedLimit,
		Offset:   0,
	})
	if err != nil {
		return fmt.Errorf("list products: %w", err)
	}
	if len(products) == 0 {
		return nil
	}

	if err := db.Q.ClearVendorFeaturedProducts(ctx, vendor.ID); err != nil {
		return err
	}
	for _, product := range products {
		if err := db.Q.SetProductFeatured(ctx, sqlc.SetProductFeaturedParams{
			Featured: 1,
			ID:       product.ID,
		}); err != nil {
			return err
		}
	}

	log.Printf("Seeded %d featured products", len(products))
	return nil
}

func seedVendorApplications(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer2@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer2: %w", err)
	}

	existing, _ := q.GetPendingApplicationByUser(ctx, &customer.ID)
	if !existing.ID.IsZero() {
		log.Println("Vendor application already exists, skipping")
		return nil
	}

	categories, _ := json.Marshal(models.StringArray{"men", "women", "kids"})
	customerID := customer.ID
	if err := q.CreateVendorApplication(ctx, sqlc.CreateVendorApplicationParams{
		ID:                  utils.GenerateBinaryID(),
		UserID:              &customerID,
		ApplicantName:       customer.FullName,
		StoreName:           "Style House",
		BusinessDescription: "Fashion retailer for modern styles",
		Logo:                "https://via.placeholder.com/200",
		BusinessCertificate: "https://via.placeholder.com/certificate.pdf",
		VendorPhoto:         "https://via.placeholder.com/200",
		BusinessPhoto:       "https://via.placeholder.com/600x300",
		BusinessEmail:       "style@lumiafrica.com",
		ContactPhone:        "+254700000005",
		Country:             "Kenya",
		City:                "Nairobi",
		RegistrationNumber:  "REG123456",
		Categories:          categories,
	}); err != nil {
		return err
	}

	log.Println("Created vendor application")
	return nil
}

func seedSubscriptions(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	existing, _ := q.GetActiveSubscription(ctx, vendor.ID)
	if !existing.ID.IsZero() {
		log.Println("Subscription already exists, skipping")
		return nil
	}

	if err := q.CreateSubscription(ctx, sqlc.CreateSubscriptionParams{
		ID:            utils.GenerateBinaryID(),
		VendorID:      vendor.ID,
		Plan:          sqlc.VendorSubscriptionsPlanMonthly,
		AmountPaid:    "2500.00",
		PaymentMethod: "mpesa",
		StartedAt:     time.Now(),
		ExpiresAt:     time.Now().AddDate(0, 1, 0),
	}); err != nil {
		return err
	}

	log.Println("Created vendor subscription")
	return nil
}
