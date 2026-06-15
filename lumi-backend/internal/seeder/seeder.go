package seeder

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"lumi-backend/internal/database"
	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/models"
	"lumi-backend/internal/store"
	"lumi-backend/internal/utils"
)

func SeedAll(db *database.DB) error {
	log.Println("Starting database seeding...")

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
	if err := seedSubscriptions(db); err != nil {
		return fmt.Errorf("seed subscriptions: %w", err)
	}
	if err := seedVendorApplications(db); err != nil {
		return fmt.Errorf("seed vendor applications: %w", err)
	}

	log.Println("Database seeding complete!")
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

		_, err = q.GetUserByEmail(ctx, u.email)
		if err == nil {
			log.Printf("User %s already exists, skipping", u.email)
			continue
		}

		err = q.CreateUser(ctx, sqlc.CreateUserParams{
			ID:       utils.GenerateID(),
			FullName: u.fullName,
			Email:    u.email,
			Phone:    u.phone,
			Password: hashedPwd,
			Role:     u.role,
			Disabled: sql.NullBool{Bool: false, Valid: true},
		})
		if err != nil {
			return err
		}
		log.Printf("Created user: %s", u.email)
	}

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

	err = q.CreateAddress(ctx, sqlc.CreateAddressParams{
		ID:        utils.GenerateID(),
		UserID:    customer.ID,
		Label:     "Home",
		Street:    "123 Main St",
		City:      "Nairobi",
		State:     "Nairobi",
		Country:   "Kenya",
		ZipCode:   "00100",
		IsDefault: sql.NullBool{Bool: true, Valid: true},
	})
	if err != nil {
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
		if exists.ID != "" {
			log.Printf("Vendor for %s already exists, skipping", vu.email)
			continue
		}

		categories, _ := json.Marshal(models.StringArray{"men", "women", "kids", "accessories", "activewear"})
		err = q.CreateVendor(ctx, sqlc.CreateVendorParams{
			ID:            utils.GenerateID(),
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
			Categories:    categories,
		})
		if err != nil {
			return err
		}
		if _, err := db.SQL.ExecContext(ctx, "UPDATE vendors SET is_featured = true WHERE user_id = ?", user.ID); err != nil {
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

	products := []productSeed{
		{name: "Nairobi Air Max Sneaker", description: "Lightweight men's running sneaker with breathable mesh and city-ready grip.", brand: "Nike", category: "men", subcategory: "shoes", gender: models.GenderMen, price: 8500, discount: 15, sizes: models.StringArray{"9", "10", "11"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "White", Code: "#FFFFFF"}}, sku: "MEN-SHO-001", stock: 24, rating: 4.8, reviewCount: 9, bestseller: true, newArrival: false, featured: true, trending: true, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"},
		{name: "Classic White Oxford Shirt", description: "Crisp cotton oxford shirt for office days and smart casual weekends.", brand: "Lumé", category: "men", subcategory: "shirts", gender: models.GenderMen, price: 3200, discount: 0, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Blue", Code: "#2563EB"}}, sku: "MEN-SHI-001", stock: 40, rating: 4.6, reviewCount: 7, bestseller: true, newArrival: false, featured: true, trending: false, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"},
		{name: "Nairobi Denim Jacket", description: "Durable denim jacket with a modern slim fit for cool evenings.", brand: "Safari", category: "men", subcategory: "jackets", gender: models.GenderMen, price: 7200, discount: 10, sizes: models.StringArray{"M", "L", "XL"}, colors: models.ColorArray{{Name: "Blue", Code: "#1E40AF"}, {Name: "Black", Code: "#111111"}}, sku: "MEN-JAC-001", stock: 18, rating: 4.7, reviewCount: 6, bestseller: true, newArrival: false, featured: false, trending: true, image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80"},

		{name: "Floral Summer Midi Dress", description: "Flowy midi dress with African-inspired floral accents and a comfortable lining.", brand: "AfriChic", category: "women", subcategory: "dresses", gender: models.GenderWomen, price: 5600, discount: 20, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Floral", Code: "#E11D48"}, {Name: "Cream", Code: "#F5E6C8"}}, sku: "WOM-DRE-001", stock: 30, rating: 4.9, reviewCount: 10, bestseller: true, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"},
		{name: "Elegant Satin Blouse", description: "Soft satin blouse with a relaxed fit, ideal for work or evening wear.", brand: "Lumé", category: "women", subcategory: "tops", gender: models.GenderWomen, price: 3900, discount: 0, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Ivory", Code: "#FFF8E7"}, {Name: "Black", Code: "#111111"}}, sku: "WOM-TOP-001", stock: 36, rating: 4.5, reviewCount: 5, bestseller: false, newArrival: true, featured: true, trending: false, image: "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&w=900&q=80"},
		{name: "High Waist Wide Leg Jeans", description: "Comfortable wide leg jeans with stretch denim and a flattering high waist.", brand: "Nairobi", category: "women", subcategory: "denim", gender: models.GenderWomen, price: 6200, discount: 12, sizes: models.StringArray{"26", "28", "30", "32"}, colors: models.ColorArray{{Name: "Blue", Code: "#2563EB"}, {Name: "Black", Code: "#111111"}}, sku: "WOM-DEN-001", stock: 28, rating: 4.6, reviewCount: 6, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80"},

		{name: "Kids Denim Jacket", description: "Durable denim jacket for kids with soft lining and easy-care fabric.", brand: "Kito", category: "kids", subcategory: "jackets", gender: models.GenderKids, price: 3500, discount: 0, sizes: models.StringArray{"2T", "3T", "4T", "5T"}, colors: models.ColorArray{{Name: "Blue", Code: "#2563EB"}, {Name: "Light Blue", Code: "#93C5FD"}}, sku: "KID-JAC-001", stock: 34, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: true, featured: false, trending: false, image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=80"},
		{name: "School Polo Shirt", description: "Breathable school polo shirt with reinforced seams for daily wear.", brand: "Kito", category: "kids", subcategory: "shirts", gender: models.GenderKids, price: 1800, discount: 0, sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Navy", Code: "#1E3A8A"}, {Name: "White", Code: "#FFFFFF"}}, sku: "KID-SHI-001", stock: 50, rating: 4.3, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80"},
		{name: "Kids Canvas Sneakers", description: "Flexible canvas sneakers with cushioned soles for playtime and school.", brand: "Vivo", category: "kids", subcategory: "shoes", gender: models.GenderKids, price: 2600, discount: 10, sizes: models.StringArray{"28", "30", "32", "34"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Red", Code: "#DC2626"}}, sku: "KID-SHO-001", stock: 42, rating: 4.5, reviewCount: 5, bestseller: false, newArrival: false, featured: false, trending: true, image: "https://images.unsplash.com/photo-1514986888952-8cd3225997a6?auto=format&fit=crop&w=900&q=80"},

		{name: "Beaded Crossbody Bag", description: "Handcrafted crossbody bag with colorful beadwork and adjustable strap.", brand: "AfriChic", category: "accessories", subcategory: "bags", gender: models.GenderUnisex, price: 4200, discount: 0, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Multi", Code: "#7C2D12"}, {Name: "Tan", Code: "#B45309"}}, sku: "ACC-BAG-001", stock: 22, rating: 4.7, reviewCount: 6, bestseller: true, newArrival: false, featured: true, trending: true, image: "https://images.unsplash.com/photo-1591561954557-2694077c147e?auto=format&fit=crop&w=900&q=80"},
		{name: "Gold Hoop Earrings", description: "Lightweight gold-tone hoops with a polished finish for everyday styling.", brand: "Safari", category: "accessories", subcategory: "jewelry", gender: models.GenderUnisex, price: 1500, discount: 0, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Gold", Code: "#D4AF37"}}, sku: "ACC-JEW-001", stock: 60, rating: 4.2, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1630019852942-f89202989a51?auto=format&fit=crop&w=900&q=80"},
		{name: "Woven Straw Sun Hat", description: "Breathable woven sun hat with a wide brim for beach days and travel.", brand: "Nairobi", category: "accessories", subcategory: "hats", gender: models.GenderUnisex, price: 2200, discount: 15, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Natural", Code: "#D6B98C"}}, sku: "ACC-HAT-001", stock: 26, rating: 4.1, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80"},

		{name: "Vivo Running Shorts", description: "Moisture-wicking running shorts with zip pockets and stretch panels.", brand: "Vivo", category: "activewear", subcategory: "shorts", gender: models.GenderUnisex, price: 2900, discount: 0, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Grey", Code: "#6B7280"}}, sku: "ACT-SHO-001", stock: 44, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: true, featured: false, trending: false, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"},
		{name: "Performance Training Tee", description: "Soft training tee with breathable fabric and a clean athletic cut.", brand: "Vivo", category: "activewear", subcategory: "tops", gender: models.GenderUnisex, price: 2400, discount: 10, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Navy", Code: "#1E3A8A"}, {Name: "White", Code: "#FFFFFF"}}, sku: "ACT-TOP-001", stock: 48, rating: 4.5, reviewCount: 5, bestseller: false, newArrival: true, featured: true, trending: false, image: "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?auto=format&fit=crop&w=900&q=80"},
		{name: "Lightweight Yoga Leggings", description: "High-waist leggings with four-way stretch for yoga, errands, and travel.", brand: "Vivo", category: "activewear", subcategory: "leggings", gender: models.GenderWomen, price: 3800, discount: 0, sizes: models.StringArray{"XS", "S", "M", "L"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Olive", Code: "#3F6212"}}, sku: "ACT-LEG-001", stock: 36, rating: 4.6, reviewCount: 6, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=900&q=80"},

		{name: "Premium Leather Belt", description: "Full-grain leather belt with a matte buckle and refined edge paint.", brand: "Safari", category: "accessories", subcategory: "belts", gender: models.GenderMen, price: 3000, discount: 0, sizes: models.StringArray{"32", "34", "36", "38"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Black", Code: "#111111"}}, sku: "ACC-BEL-001", stock: 30, rating: 4.3, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80"},
		{name: "Lumé Slim Chinos", description: "Comfortable slim-fit chinos for work, travel, and smart casual outfits.", brand: "Lumé", category: "men", subcategory: "trousers", gender: models.GenderMen, price: 4800, discount: 8, sizes: models.StringArray{"30", "32", "34", "36"}, colors: models.ColorArray{{Name: "Khaki", Code: "#C2A36A"}, {Name: "Navy", Code: "#1E3A8A"}}, sku: "MEN-TRO-001", stock: 32, rating: 4.5, reviewCount: 5, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80"},
		{name: "Nairobi Linen Shirt", description: "Breathable linen shirt with a relaxed fit for warm East African days.", brand: "Nairobi", category: "men", subcategory: "shirts", gender: models.GenderMen, price: 4100, discount: 0, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Sand", Code: "#D8C3A5"}, {Name: "White", Code: "#FFFFFF"}}, sku: "MEN-SHI-002", stock: 34, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80"},

		{name: "Kitenge Wrap Skirt", description: "Colorful kitenge wrap skirt with a flattering A-line silhouette.", brand: "AfriChic", category: "women", subcategory: "skirts", gender: models.GenderWomen, price: 4600, discount: 15, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Multi", Code: "#BE123C"}, {Name: "Orange", Code: "#EA580C"}}, sku: "WOM-SKI-001", stock: 24, rating: 4.7, reviewCount: 6, bestseller: false, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80"},
		{name: "Minimalist Ankle Boots", description: "Sleek ankle boots with a low block heel and cushioned insole.", brand: "Safari", category: "women", subcategory: "shoes", gender: models.GenderWomen, price: 7800, discount: 0, sizes: models.StringArray{"37", "38", "39", "40"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Tan", Code: "#B45309"}}, sku: "WOM-SHO-001", stock: 18, rating: 4.6, reviewCount: 5, bestseller: false, newArrival: false, featured: false, trending: true, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"},
		{name: "Soft Knit Cardigan", description: "Lightweight knit cardigan for layering over dresses or office tops.", brand: "Lumé", category: "women", subcategory: "knitwear", gender: models.GenderWomen, price: 5200, discount: 10, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Beige", Code: "#D8C3A5"}, {Name: "Grey", Code: "#6B7280"}}, sku: "WOM-KNI-001", stock: 22, rating: 4.5, reviewCount: 4, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80"},

		{name: "Kids Hooded Sweatshirt", description: "Warm hooded sweatshirt with soft fleece lining and playful colors.", brand: "Kito", category: "kids", subcategory: "hoodies", gender: models.GenderKids, price: 3200, discount: 0, sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Grey", Code: "#6B7280"}, {Name: "Navy", Code: "#1E3A8A"}}, sku: "KID-HOO-001", stock: 38, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80"},
		{name: "Kids Cargo Shorts", description: "Comfortable cargo shorts with multiple pockets for active play.", brand: "Kito", category: "kids", subcategory: "shorts", gender: models.GenderKids, price: 2100, discount: 5, sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Khaki", Code: "#C2A36A"}, {Name: "Green", Code: "#166534"}}, sku: "KID-SHO-002", stock: 46, rating: 4.2, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80"},
		{name: "Kids Rain Jacket", description: "Water-resistant rain jacket with reflective details for school commutes.", brand: "Vivo", category: "kids", subcategory: "jackets", gender: models.GenderKids, price: 4200, discount: 12, sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Yellow", Code: "#FACC15"}, {Name: "Blue", Code: "#2563EB"}}, sku: "KID-JAC-002", stock: 26, rating: 4.5, reviewCount: 4, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80"},

		{name: "Minimal Leather Wallet", description: "Compact leather wallet with card slots and a slim profile.", brand: "Safari", category: "accessories", subcategory: "wallets", gender: models.GenderUnisex, price: 2400, discount: 0, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Black", Code: "#111111"}}, sku: "ACC-WAL-001", stock: 52, rating: 4.3, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1627123424574-181ce5171c98?auto=format&fit=crop&w=900&q=80"},
		{name: "Canvas Weekender Tote", description: "Spacious canvas tote for weekend trips, work, and market days.", brand: "Nairobi", category: "accessories", subcategory: "bags", gender: models.GenderUnisex, price: 5400, discount: 8, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Beige", Code: "#D8C3A5"}, {Name: "Black", Code: "#111111"}}, sku: "ACC-BAG-002", stock: 20, rating: 4.6, reviewCount: 5, bestseller: false, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80"},
		{name: "Classic Aviator Sunglasses", description: "Lightweight aviator sunglasses with UV protection and a timeless frame.", brand: "Safari", category: "accessories", subcategory: "sunglasses", gender: models.GenderUnisex, price: 3600, discount: 20, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Gold", Code: "#D4AF37"}, {Name: "Black", Code: "#111111"}}, sku: "ACC-SUN-001", stock: 28, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: false, featured: false, trending: true, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80"},

		{name: "Vivo Zip Track Jacket", description: "Athletic zip jacket with moisture-wicking fabric and reflective piping.", brand: "Vivo", category: "activewear", subcategory: "jackets", gender: models.GenderUnisex, price: 5600, discount: 0, sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Teal", Code: "#0F766E"}}, sku: "ACT-JAC-001", stock: 24, rating: 4.7, reviewCount: 6, bestseller: true, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80"},
		{name: "Compression Sports Socks", description: "Cushioned sports socks with arch support for running and gym sessions.", brand: "Vivo", category: "activewear", subcategory: "socks", gender: models.GenderUnisex, price: 900, discount: 0, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Black", Code: "#111111"}}, sku: "ACT-SOC-001", stock: 80, rating: 4.2, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=900&q=80"},
		{name: "Seamless Sports Bra", description: "Medium-support sports bra with seamless construction for training.", brand: "Vivo", category: "activewear", subcategory: "tops", gender: models.GenderWomen, price: 2800, discount: 15, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Mauve", Code: "#A16286"}}, sku: "ACT-TOP-002", stock: 34, rating: 4.5, reviewCount: 5, bestseller: false, newArrival: true, featured: false, trending: false, image: "https://images.unsplash.com/photo-1606902965551-dce0a0879090?auto=format&fit=crop&w=900&q=80"},

		{name: "Lumé Tailored Blazer", description: "Sharp tailored blazer with a modern fit for meetings and events.", brand: "Lumé", category: "men", subcategory: "blazers", gender: models.GenderMen, price: 12000, discount: 10, sizes: models.StringArray{"M", "L", "XL"}, colors: models.ColorArray{{Name: "Navy", Code: "#1E3A8A"}, {Name: "Charcoal", Code: "#374151"}}, sku: "MEN-BLA-001", stock: 14, rating: 4.8, reviewCount: 6, bestseller: true, newArrival: false, featured: true, trending: false, image: "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&w=900&q=80"},
		{name: "AfriChic Maxi Dress", description: "Elegant maxi dress with bold kitenge trim and a breathable cotton blend.", brand: "AfriChic", category: "women", subcategory: "dresses", gender: models.GenderWomen, price: 7200, discount: 0, sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Multi", Code: "#BE123C"}, {Name: "Black", Code: "#111111"}}, sku: "WOM-DRE-002", stock: 20, rating: 4.8, reviewCount: 7, bestseller: true, newArrival: false, featured: true, trending: true, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80"},
		{name: "Nairobi City Backpack", description: "Compact city backpack with padded laptop sleeve and water-resistant fabric.", brand: "Nairobi", category: "accessories", subcategory: "bags", gender: models.GenderUnisex, price: 6800, discount: 0, sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Olive", Code: "#3F6212"}}, sku: "ACC-BAG-003", stock: 18, rating: 4.7, reviewCount: 5, bestseller: true, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a78?auto=format&fit=crop&w=900&q=80"},
		{name: "Kito Graphic Tee", description: "Soft cotton graphic tee with playful prints for everyday kids' outfits.", brand: "Kito", category: "kids", subcategory: "tops", gender: models.GenderKids, price: 1600, discount: 0, sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Blue", Code: "#2563EB"}}, sku: "KID-TOP-001", stock: 54, rating: 4.3, reviewCount: 3, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80"},
		{name: "Vivo Court Sneaker", description: "Clean court sneaker with durable rubber sole and padded collar.", brand: "Vivo", category: "activewear", subcategory: "shoes", gender: models.GenderUnisex, price: 6400, discount: 10, sizes: models.StringArray{"39", "40", "41", "42"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Green", Code: "#166534"}}, sku: "ACT-SHO-002", stock: 30, rating: 4.6, reviewCount: 5, bestseller: false, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80"},
		{name: "Safari Leather Sandals", description: "Hand-finished leather sandals with a comfortable footbed for daily wear.", brand: "Safari", category: "accessories", subcategory: "sandals", gender: models.GenderUnisex, price: 4800, discount: 5, sizes: models.StringArray{"39", "40", "41", "42", "43"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Tan", Code: "#B45309"}}, sku: "ACC-SAN-001", stock: 24, rating: 4.4, reviewCount: 4, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1603487742131-4160d6986ba2?auto=format&fit=crop&w=900&q=80"},
	}

	for _, p := range products {
		productID := utils.GenerateID()
		images, _ := json.Marshal(models.StringArray{p.image})
		colors, _ := json.Marshal(p.colors)
		err = q.CreateProduct(ctx, sqlc.CreateProductParams{
			ID:          productID,
			VendorID:    vendor.ID,
			Name:        p.name,
			Description: p.description,
			Brand:       p.brand,
			Category:    p.category,
			Subcategory: p.subcategory,
			Gender:      sqlc.ProductsGender(p.gender),
			Price:       fmt.Sprintf("%.2f", p.price),
			Discount:    sql.NullString{String: fmt.Sprintf("%.2f", p.discount), Valid: p.discount > 0},
			Images:      images,
			Colors:      colors,
			Sizes:       store.StringArrayToJSON(p.sizes),
			Sku:         p.sku,
			Stock:       int32(p.stock),
			Bestseller:  boolParam(p.bestseller),
			NewArrival:  boolParam(p.newArrival),
			Featured:    boolParam(p.featured),
			Trending:    boolParam(p.trending),
		})
		if err != nil {
			return err
		}
		if err := q.ModerateProduct(ctx, sqlc.ModerateProductParams{ID: productID, Status: sqlc.ProductsStatusActive}); err != nil {
			return err
		}
		log.Printf("Created product: %s", p.name)
	}

	return nil
}

type productSeed struct {
	name        string
	description string
	brand       string
	category    string
	subcategory string
	gender      models.Gender
	price       float64
	discount    float64
	sizes       models.StringArray
	colors      models.ColorArray
	sku         string
	stock       int
	rating      float64
	reviewCount int
	bestseller  bool
	newArrival  bool
	featured    bool
	trending    bool
	image       string
}

func boolParam(value bool) sql.NullBool {
	return sql.NullBool{Bool: value, Valid: true}
}

func seedOrders(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer: %w", err)
	}

	existing, _ := q.ListOrdersByUser(ctx, sqlc.ListOrdersByUserParams{UserID: customer.ID, Limit: 10, Offset: 0})
	if len(existing) > 0 {
		log.Println("Orders already exist, skipping")
		return nil
	}

	vendorID := getVendorIDValue(db, "vendor@lumiafrica.com")
	if vendorID == "" {
		return fmt.Errorf("vendor not found")
	}
	products, err := q.ListProductsByVendor(ctx, vendorID)
	if err != nil {
		return fmt.Errorf("list products: %w", err)
	}
	if len(products) == 0 {
		return fmt.Errorf("no products available for orders")
	}

	for i, product := range products {
		extraOrders := 0
		if i < 9 {
			extraOrders = 2
		}
		for j := 0; j <= extraOrders; j++ {
			items, _ := json.Marshal([]models.OrderItem{{
				ProductID:    product.ID,
				ProductName:  product.Name,
				ProductImage: firstImage(product.Images),
				VendorID:     product.VendorID,
				Price:        store.ToFloat(product.Price),
				Quantity:     1,
				Size:         firstSize(product.Sizes),
				Color:        "Black",
			}})
			orderID := utils.GenerateID()
			if err := q.CreateOrder(ctx, sqlc.CreateOrderParams{
				ID:              orderID,
				UserID:          customer.ID,
				Items:           items,
				Subtotal:        product.Price,
				ShippingCost:    "500.00",
				Total:           fmt.Sprintf("%.2f", store.ToFloat(product.Price)+500),
				PaymentMethod:   "mpesa",
				DeliveryAddress: "123 Main St, Nairobi, Kenya",
				Notes:           sql.NullString{String: "Demo order for seeded marketplace data", Valid: true},
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

	vendorID := getVendorIDValue(db, "vendor@lumiafrica.com")
	if vendorID == "" {
		return fmt.Errorf("vendor not found")
	}

	products, err := q.ListProductsByVendor(ctx, vendorID)
	if err != nil {
		return fmt.Errorf("list products: %w", err)
	}
	if len(products) == 0 {
		return fmt.Errorf("no products available for reviews")
	}

	orders, err := q.ListOrdersByUser(ctx, sqlc.ListOrdersByUserParams{UserID: customer.ID, Limit: 200, Offset: 0})
	if err != nil || len(orders) == 0 {
		return fmt.Errorf("get orders: %w", err)
	}

	vendor, err := getVendorByEmail(db, "vendor@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get vendor: %w", err)
	}

	for i, product := range products {
		reviewsToCreate := 1
		if i < 9 {
			reviewsToCreate = 3
		}
		for j := 0; j < reviewsToCreate && j < len(orders); j++ {
			order := orders[(i*3+j)%len(orders)]
			reviewID := utils.GenerateID()
			if err := q.CreateReview(ctx, sqlc.CreateReviewParams{
				ID:        reviewID,
				ProductID: product.ID,
				VendorID:  vendor.ID,
				UserID:    customer.ID,
				OrderID:   order.ID,
				Rating:    reviewRatingForProduct(i, j),
				Comment:   reviewCommentForProduct(i, j),
			}); err != nil {
				return err
			}
		}

		rating := 4.1 + float64(i%5)*0.15
		reviewCount := 3
		if i < 9 {
			rating = 4.6 + float64(i%4)*0.1
			reviewCount = 9 - i
		}
		if err := q.UpdateProductRating(ctx, sqlc.UpdateProductRatingParams{
			ID:          product.ID,
			Rating:      sql.NullString{String: fmt.Sprintf("%.2f", rating), Valid: true},
			ReviewCount: sql.NullInt32{Int32: int32(reviewCount), Valid: true},
		}); err != nil {
			return err
		}
	}

	if err := refreshVendorStats(db, vendor.ID); err != nil {
		return err
	}

	log.Println("Created reviews and refreshed product ratings")
	return nil
}

func seedVendorApplications(db *database.DB) error {
	ctx := context.Background()
	q := db.Q

	customer, err := getUserByEmail(db, "customer2@lumiafrica.com")
	if err != nil {
		return fmt.Errorf("get customer2: %w", err)
	}

	existing, _ := q.GetPendingApplicationByUser(ctx, customer.ID)
	if existing.ID != "" {
		log.Println("Vendor application already exists, skipping")
		return nil
	}

	categories, _ := json.Marshal(models.StringArray{"men", "women", "kids"})
	err = q.CreateVendorApplication(ctx, sqlc.CreateVendorApplicationParams{
		ID:                  utils.GenerateID(),
		UserID:              customer.ID,
		StoreName:           "Style House",
		BusinessDescription: "Fashion retailer for modern styles",
		Logo:                "https://via.placeholder.com/200",
		BusinessEmail:       "style@lumiafrica.com",
		ContactPhone:        "+254700000005",
		Country:             "Kenya",
		City:                "Nairobi",
		RegistrationNumber:  "REG123456",
		Categories:          categories,
	})
	if err != nil {
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
	if existing.ID != "" {
		log.Println("Subscription already exists, skipping")
		return nil
	}

	err = q.CreateSubscription(ctx, sqlc.CreateSubscriptionParams{
		ID:            utils.GenerateID(),
		VendorID:      vendor.ID,
		Plan:          sqlc.VendorSubscriptionsPlanMonthly,
		AmountPaid:    "2500.00",
		PaymentMethod: "mpesa",
		StartedAt:     time.Now(),
		ExpiresAt:     time.Now().AddDate(0, 1, 0),
	})
	if err != nil {
		return err
	}

	log.Println("Created vendor subscription")
	return nil
}

func getVendorIDValue(db *database.DB, email string) string {
	vendor, err := getVendorByEmail(db, email)
	if err != nil {
		return ""
	}
	return vendor.ID
}

func firstImage(images json.RawMessage) string {
	var arr models.StringArray
	if err := json.Unmarshal(images, &arr); err != nil || len(arr) == 0 {
		return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=300&q=80"
	}
	return arr[0]
}

func firstSize(sizes json.RawMessage) string {
	var arr models.StringArray
	if err := json.Unmarshal(sizes, &arr); err != nil || len(arr) == 0 {
		return "M"
	}
	return arr[0]
}

func reviewRatingForProduct(i, j int) int32 {
	base := int32(4 + (i % 2))
	if i < 9 {
		base = int32(5 - (j % 2))
	}
	return base
}

func reviewCommentForProduct(i, j int) string {
	comments := []string{
		"Excellent quality and true to size.",
		"Fast delivery and the finish looks premium.",
		"Great value for money, I would buy again.",
	}
	return fmt.Sprintf("%s Seed review %d for product %d.", comments[(i+j)%len(comments)], j+1, i+1)
}

func refreshVendorStats(db *database.DB, vendorID string) error {
	_, err := db.SQL.ExecContext(context.Background(), `
		UPDATE vendors
		SET product_count = (
			SELECT COUNT(*) FROM products WHERE vendor_id = ?
		),
		rating = (
			SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM products WHERE vendor_id = ? AND rating > 0
		),
		total_sales = (
			SELECT COALESCE(SUM(CAST(price AS DECIMAL(15,2)) * review_count), 0) FROM products WHERE vendor_id = ?
		),
		is_featured = true
		WHERE id = ?
	`, vendorID, vendorID, vendorID, vendorID)
	return err
}

func getUserByEmail(db *database.DB, email string) (*sqlc.User, error) {
	user, err := db.Q.GetUserByEmail(context.Background(), email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func getVendorByEmail(db *database.DB, email string) (*sqlc.Vendor, error) {
	user, err := db.Q.GetUserByEmail(context.Background(), email)
	if err != nil {
		return nil, err
	}
	vendor, err := db.Q.GetVendorByUserID(context.Background(), user.ID)
	if err != nil {
		return nil, err
	}
	return &vendor, nil
}

func getFirstProduct(db *database.DB) (*sqlc.Product, error) {
	products, err := db.Q.SearchProducts(context.Background(), sqlc.SearchProductsParams{Limit: 1, Offset: 0})
	if err != nil || len(products) == 0 {
		return nil, err
	}
	return &products[0], nil
}

func getFirstOrder(db *database.DB) (*sqlc.Order, error) {
	orders, err := db.Q.ListRecentOrders(context.Background(), 1)
	if err != nil || len(orders) == 0 {
		return nil, err
	}
	return &orders[0], nil
}
