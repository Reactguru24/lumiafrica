package seeder

import (
	"github.com/Reactguru24/lumiafrica/internal/catalog"
	"github.com/Reactguru24/lumiafrica/internal/models"
)

// vendorProductTemplate defines one catalog item per UI category bucket (4 × 5 = 20).
type vendorProductTemplate struct {
	baseName     string
	description  string
	brand        string
	category     string
	subcategory  string
	gender       models.Gender
	price        float64
	discount     float64
	skuSuffix    string
	sizes        models.StringArray
	colors       models.ColorArray
	stock        int
	bestseller   bool
	newArrival   bool
	featured     bool
	trending     bool
	categoryLead bool
	image        string
}

func vendorProductTemplates() []vendorProductTemplate {
	items := []vendorProductTemplate{
		// Men (4)
		{baseName: "Classic Cotton Tee", description: "Soft everyday tee with a relaxed fit and durable stitching.", brand: "Lumé", category: "men", subcategory: "t-shirts", gender: models.GenderMen, price: 2200, discount: 0, skuSuffix: "MEN-TSH-01", sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Black", Code: "#111111"}}, stock: 36, bestseller: true, newArrival: false, featured: true, trending: false, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Oxford Button-Down Shirt", description: "Crisp shirt for office wear and smart casual outings.", brand: "Safari", category: "men", subcategory: "shirts", gender: models.GenderMen, price: 3400, discount: 10, skuSuffix: "MEN-SHI-01", sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Blue", Code: "#2563EB"}, {Name: "White", Code: "#FFFFFF"}}, stock: 32, bestseller: false, newArrival: true, featured: true, trending: false, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Urban Zip Hoodie", description: "Mid-weight hoodie with kangaroo pocket and soft fleece lining.", brand: "Nairobi", category: "men", subcategory: "hoodies", gender: models.GenderMen, price: 4800, discount: 0, skuSuffix: "MEN-HOO-01", sizes: models.StringArray{"M", "L", "XL"}, colors: models.ColorArray{{Name: "Grey", Code: "#6B7280"}, {Name: "Navy", Code: "#1E3A8A"}}, stock: 28, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Slim Fit Denim Jacket", description: "Classic denim jacket with modern tailoring and strong seams.", brand: "Safari", category: "men", subcategory: "jackets", gender: models.GenderMen, price: 6900, discount: 8, skuSuffix: "MEN-JAC-01", sizes: models.StringArray{"M", "L", "XL"}, colors: models.ColorArray{{Name: "Blue", Code: "#1E40AF"}, {Name: "Black", Code: "#111111"}}, stock: 20, bestseller: true, newArrival: false, featured: false, trending: true, image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80"},

		// Women (4)
		{baseName: "Floral Midi Dress", description: "Flowy midi dress with vibrant prints and a comfortable lining.", brand: "AfriChic", category: "women", subcategory: "dresses", gender: models.GenderWomen, price: 5800, discount: 15, skuSuffix: "WOM-DRE-01", sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Floral", Code: "#E11D48"}, {Name: "Cream", Code: "#F5E6C8"}}, stock: 26, bestseller: true, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Everyday Knit Top", description: "Soft knit top with a flattering cut for work or weekends.", brand: "Lumé", category: "women", subcategory: "tops", gender: models.GenderWomen, price: 3200, discount: 0, skuSuffix: "WOM-TOP-01", sizes: models.StringArray{"S", "M", "L", "XL"}, colors: models.ColorArray{{Name: "Ivory", Code: "#FFF8E7"}, {Name: "Black", Code: "#111111"}}, stock: 34, bestseller: false, newArrival: true, featured: true, trending: false, image: "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Satin Office Blouse", description: "Elegant blouse with a relaxed drape for professional settings.", brand: "AfriChic", category: "women", subcategory: "blouses", gender: models.GenderWomen, price: 4100, discount: 5, skuSuffix: "WOM-BLO-01", sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Blush", Code: "#F9A8D4"}}, stock: 30, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Kitenge Wrap Skirt", description: "Colorful wrap skirt with an adjustable fit and bold African print.", brand: "AfriChic", category: "women", subcategory: "skirts", gender: models.GenderWomen, price: 4500, discount: 10, skuSuffix: "WOM-SKI-01", sizes: models.StringArray{"S", "M", "L"}, colors: models.ColorArray{{Name: "Multi", Code: "#BE123C"}, {Name: "Orange", Code: "#EA580C"}}, stock: 22, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80"},

		// Kids (4)
		{baseName: "Boys Playtime Set", description: "Comfortable two-piece set for active boys.", brand: "Kito", category: "kids", subcategory: "boys", gender: models.GenderKids, price: 2800, discount: 0, skuSuffix: "KID-BOY-01", sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Blue", Code: "#2563EB"}, {Name: "Green", Code: "#166534"}}, stock: 40, bestseller: false, newArrival: true, featured: false, trending: false, image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Girls Party Dress", description: "Light party dress with soft fabric and playful details.", brand: "Kito", category: "kids", subcategory: "girls", gender: models.GenderKids, price: 3100, discount: 0, skuSuffix: "KID-GIR-01", sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Pink", Code: "#F472B6"}, {Name: "Purple", Code: "#9333EA"}}, stock: 36, bestseller: false, newArrival: true, featured: true, trending: false, image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Baby Soft Romper", description: "Gentle cotton romper for infants with easy snap closures.", brand: "Kito", category: "kids", subcategory: "baby-wear", gender: models.GenderKids, price: 1900, discount: 0, skuSuffix: "KID-BAB-01", sizes: models.StringArray{"0-3M", "3-6M", "6-12M"}, colors: models.ColorArray{{Name: "Cream", Code: "#F5E6C8"}, {Name: "Mint", Code: "#6EE7B7"}}, stock: 44, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1514986888952-8cd3225997a6?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Kids School Polo", description: "Breathable polo shirt with reinforced seams for daily wear.", brand: "Kito", category: "kids", subcategory: "boys", gender: models.GenderKids, price: 1800, discount: 0, skuSuffix: "KID-BOY-02", sizes: models.StringArray{"4", "6", "8", "10"}, colors: models.ColorArray{{Name: "Navy", Code: "#1E3A8A"}, {Name: "White", Code: "#FFFFFF"}}, stock: 48, bestseller: true, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80"},

		// Accessories (4)
		{baseName: "Leather Crossbody Bag", description: "Compact crossbody bag with adjustable strap and secure zip.", brand: "Safari", category: "accessories", subcategory: "bags", gender: models.GenderUnisex, price: 4600, discount: 0, skuSuffix: "ACC-BAG-01", sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Black", Code: "#111111"}}, stock: 24, bestseller: true, newArrival: false, featured: true, trending: true, image: "https://images.unsplash.com/photo-1591561954557-2694077c147e?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Classic Leather Belt", description: "Full-grain belt with a matte buckle for everyday outfits.", brand: "Safari", category: "accessories", subcategory: "belts", gender: models.GenderUnisex, price: 2800, discount: 0, skuSuffix: "ACC-BEL-01", sizes: models.StringArray{"32", "34", "36", "38"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Black", Code: "#111111"}}, stock: 30, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Embroidered Cap", description: "Structured cap with breathable panels and adjustable closure.", brand: "Nairobi", category: "accessories", subcategory: "caps", gender: models.GenderUnisex, price: 1600, discount: 10, skuSuffix: "ACC-CAP-01", sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Khaki", Code: "#C2A36A"}}, stock: 50, bestseller: false, newArrival: true, featured: false, trending: false, image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Minimalist Watch", description: "Slim watch with a clean dial and comfortable strap.", brand: "Lumé", category: "accessories", subcategory: "watches", gender: models.GenderUnisex, price: 5200, discount: 5, skuSuffix: "ACC-WAT-01", sizes: models.StringArray{"One Size"}, colors: models.ColorArray{{Name: "Silver", Code: "#9CA3AF"}, {Name: "Gold", Code: "#D4AF37"}}, stock: 18, bestseller: false, newArrival: false, featured: true, trending: true, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"},

		// Footwear (4)
		{baseName: "City Runner Sneaker", description: "Lightweight sneaker with cushioned sole for daily wear.", brand: "Vivo", category: "footwear", subcategory: "sneakers", gender: models.GenderUnisex, price: 7200, discount: 12, skuSuffix: "FTW-SNK-01", sizes: models.StringArray{"39", "40", "41", "42", "43"}, colors: models.ColorArray{{Name: "White", Code: "#FFFFFF"}, {Name: "Black", Code: "#111111"}}, stock: 26, bestseller: true, newArrival: true, featured: true, trending: true, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Heritage Ankle Boot", description: "Durable ankle boot with a low block heel and soft insole.", brand: "Safari", category: "footwear", subcategory: "boots", gender: models.GenderWomen, price: 8400, discount: 0, skuSuffix: "FTW-BOO-01", sizes: models.StringArray{"37", "38", "39", "40"}, colors: models.ColorArray{{Name: "Tan", Code: "#B45309"}, {Name: "Black", Code: "#111111"}}, stock: 16, bestseller: false, newArrival: false, featured: true, trending: false, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Everyday Sandal", description: "Comfortable sandal with contoured footbed for warm weather.", brand: "Safari", category: "footwear", subcategory: "sandals", gender: models.GenderUnisex, price: 3600, discount: 0, skuSuffix: "FTW-SAN-01", sizes: models.StringArray{"39", "40", "41", "42", "43"}, colors: models.ColorArray{{Name: "Brown", Code: "#7C2D12"}, {Name: "Black", Code: "#111111"}}, stock: 32, bestseller: false, newArrival: false, featured: false, trending: false, image: "https://images.unsplash.com/photo-1603487742131-4160d6986ba2?auto=format&fit=crop&w=900&q=80"},
		{baseName: "Evening Block Heel", description: "Elegant heel with stable block base for events and evenings out.", brand: "AfriChic", category: "footwear", subcategory: "heels", gender: models.GenderWomen, price: 6800, discount: 10, skuSuffix: "FTW-HEL-01", sizes: models.StringArray{"37", "38", "39", "40"}, colors: models.ColorArray{{Name: "Black", Code: "#111111"}, {Name: "Nude", Code: "#D8C3A5"}}, stock: 14, bestseller: false, newArrival: true, featured: false, trending: true, image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"},
	}

	seenCategory := make(map[string]bool, len(catalog.OrderedParents))
	for i := range items {
		if !seenCategory[items[i].category] {
			seenCategory[items[i].category] = true
			items[i].categoryLead = true
		}
	}
	return items
}
