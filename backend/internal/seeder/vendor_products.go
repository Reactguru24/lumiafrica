package seeder

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/catalog"
	"github.com/Reactguru24/lumiafrica/internal/config"
	"github.com/Reactguru24/lumiafrica/internal/cron"
	"github.com/Reactguru24/lumiafrica/internal/database"
	"github.com/Reactguru24/lumiafrica/internal/database/sqlc"
	"github.com/Reactguru24/lumiafrica/internal/database/types"
	"github.com/Reactguru24/lumiafrica/internal/models"
)

const productsPerApprovedVendor = 20

// SeedApprovedVendorProducts ensures every non-suspended vendor has 20 active products
// spread across men, women, kids, accessories, and footwear (4 per category).
// Idempotent: skips templates whose SKU already exists; safe to re-run after connection drops.
func SeedApprovedVendorProducts(db *database.DB, cfg *config.Config) error {
	ctx := context.Background()

	if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		return db.EnsureConnected(ctx)
	}); err != nil {
		return fmt.Errorf("database ping: %w", err)
	}

	if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		return catalog.EnsureTree(ctx, q)
	}); err != nil {
		return fmt.Errorf("ensure categories: %w", err)
	}

	var vendors []sqlc.Vendor
	if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		rows, err := q.ListVendorsAdmin(ctx, sqlc.ListVendorsAdminParams{Limit: 10000, Offset: 0})
		if err != nil {
			return err
		}
		vendors = rows
		return nil
	}); err != nil {
		return fmt.Errorf("list vendors: %w", err)
	}

	templates := vendorProductTemplates()
	if len(templates) != productsPerApprovedVendor {
		return fmt.Errorf("expected %d product templates, got %d", productsPerApprovedVendor, len(templates))
	}

	var seededVendors, skippedVendors int

	for _, vendor := range vendors {
		if vendor.Suspended != 0 {
			log.Printf("Skipping suspended vendor: %s", vendor.StoreName)
			skippedVendors++
			continue
		}

		var skuSet map[string]struct{}
		var totalProducts int
		if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
			var err error
			skuSet, totalProducts, err = vendorSKUSet(ctx, q, vendor.ID)
			return err
		}); err != nil {
			return fmt.Errorf("list products for %s: %w", vendor.StoreName, err)
		}
		if totalProducts >= productsPerApprovedVendor {
			log.Printf("Vendor %q already has %d products — skipping", vendor.StoreName, totalProducts)
			skippedVendors++
			continue
		}

		if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
			return ensureVendorCatalogSetup(ctx, q, db, vendor)
		}); err != nil {
			return fmt.Errorf("setup vendor %q: %w", vendor.StoreName, err)
		}

		featuredCount, err := countVendorFeaturedProducts(ctx, db.Q, vendor.ID)
		if err != nil {
			return err
		}

		created := 0
		for _, tmpl := range templates {
			if len(skuSet) >= productsPerApprovedVendor {
				break
			}

			seed := buildVendorProductSeed(vendor, tmpl)
			if _, exists := skuSet[seed.sku]; exists {
				continue
			}

			featured := shouldFeatureTemplate(tmpl, featuredCount)

			productID, err := createSeedProductWithRetry(ctx, db, cfg, vendor.ID, seed, featured)
			if err != nil {
				return fmt.Errorf("create product %q for vendor %q: %w", seed.name, vendor.StoreName, err)
			}

			if err := moderateProductWithRetry(ctx, db, cfg, productID); err != nil {
				return err
			}

			skuSet[seed.sku] = struct{}{}
			if featured {
				featuredCount++
			}
			created++
			log.Printf("Created product for %q: %s [%s/%s]", vendor.StoreName, seed.name, tmpl.category, tmpl.subcategory)
		}

		if err := ensureFeaturedPerCategorySlug(ctx, db, cfg, vendor.ID); err != nil {
			log.Printf("Warning: could not set featured products by category for %q: %v", vendor.StoreName, err)
		}

		if created > 0 {
			seededVendors++
			log.Printf("Seeded %d products for vendor %q (%d total)", created, vendor.StoreName, len(skuSet))
		}
	}

	if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		return cron.RefreshProductFlags(ctx, q)
	}); err != nil {
		return fmt.Errorf("refresh product flags: %w", err)
	}

	log.Printf("Approved vendor product seeding complete: %d vendors updated, %d skipped", seededVendors, skippedVendors)
	return nil
}

func ensureVendorCatalogSetup(ctx context.Context, q *sqlc.Queries, db *database.DB, vendor sqlc.Vendor) error {
	for _, parentSlug := range catalog.OrderedParents {
		parent, err := q.GetCategoryBySlug(ctx, parentSlug)
		if err != nil {
			return err
		}
		if err := q.InsertVendorCategory(ctx, sqlc.InsertVendorCategoryParams{
			VendorID:   vendor.ID,
			CategoryID: parent.ID,
		}); err != nil {
			return err
		}
	}
	return seedVendorDeliveryZones(db, vendor.ID)
}

func countVendorFeaturedProducts(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID) (int, error) {
	rows, err := q.ListVendorProductSeedMeta(ctx, vendorID)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, p := range rows {
		if p.Featured != 0 {
			count++
		}
	}
	return count, nil
}

func buildVendorProductSeed(vendor sqlc.Vendor, tmpl vendorProductTemplate) productSeed {
	sku := fmt.Sprintf("%s-%s", skuPrefix(vendor.Slug), tmpl.skuSuffix)
	if len(sku) > 100 {
		sku = sku[:100]
	}

	name := fmt.Sprintf("%s %s", strings.TrimSpace(vendor.StoreName), tmpl.baseName)
	desc := fmt.Sprintf(
		"%s — %s (category: %s · %s)",
		strings.TrimSpace(vendor.StoreName),
		tmpl.description,
		tmpl.category,
		tmpl.subcategory,
	)

	return productSeed{
		name:        name,
		description: desc,
		brand:       tmpl.brand,
		category:    tmpl.category,
		subcategory: tmpl.subcategory,
		gender:      tmpl.gender,
		price:       tmpl.price,
		discount:    tmpl.discount,
		sizes:       tmpl.sizes,
		colors:      tmpl.colors,
		sku:         sku,
		stock:       tmpl.stock,
		bestseller:  tmpl.bestseller,
		newArrival:  tmpl.newArrival,
		featured:    tmpl.featured,
		trending:    tmpl.trending,
		image:       tmpl.image,
	}
}

func skuPrefix(slug string) string {
	slug = strings.ToUpper(strings.ReplaceAll(slug, "-", ""))
	if len(slug) > 24 {
		slug = slug[:24]
	}
	if slug == "" {
		slug = fmt.Sprintf("V%d", time.Now().UnixNano()%100000)
	}
	return slug
}

func vendorSKUSet(ctx context.Context, q *sqlc.Queries, vendorID types.BinaryUUID) (map[string]struct{}, int, error) {
	count, err := q.CountProductsByVendor(ctx, vendorID)
	if err != nil {
		return nil, 0, err
	}
	skus, err := q.ListProductSKUsByVendor(ctx, vendorID)
	if err != nil {
		return nil, 0, err
	}
	set := make(map[string]struct{}, len(skus))
	for _, sku := range skus {
		set[sku] = struct{}{}
	}
	return set, int(count), nil
}

// shouldFeatureTemplate marks category-leader templates and explicit featured flags.
func shouldFeatureTemplate(tmpl vendorProductTemplate, featuredCount int) bool {
	if featuredCount >= models.ProductFeaturedLimit {
		return false
	}
	if tmpl.categoryLead {
		return true
	}
	return tmpl.featured
}

func createSeedProductWithRetry(ctx context.Context, db *database.DB, cfg *config.Config, vendorID types.BinaryUUID, seed productSeed, featured bool) (types.BinaryUUID, error) {
	var id types.BinaryUUID
	err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		var inner error
		id, inner = createSeedProduct(ctx, q, vendorID, seed, featured)
		return inner
	})
	return id, err
}

func moderateProductWithRetry(ctx context.Context, db *database.DB, cfg *config.Config, productID types.BinaryUUID) error {
	return withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
		return q.ModerateProduct(ctx, sqlc.ModerateProductParams{
			ID:     productID,
			Status: sqlc.ProductsStatusActive,
		})
	})
}

// ensureFeaturedPerCategorySlug sets one featured product per parent category slug (men, women, …).
func ensureFeaturedPerCategorySlug(ctx context.Context, db *database.DB, cfg *config.Config, vendorID types.BinaryUUID) error {
	q := db.Q

	featuredCount, err := countVendorFeaturedProducts(ctx, q, vendorID)
	if err != nil {
		return err
	}

	products, err := q.ListVendorProductSeedMeta(ctx, vendorID)
	if err != nil {
		return err
	}

	categoryCache := make(map[types.BinaryUUID]sqlc.Category)
	parentSlugByProduct := make(map[types.BinaryUUID]string)
	featuredByParent := make(map[string]bool)

	for _, p := range products {
		cat, ok := categoryCache[p.CategoryID]
		if !ok {
			row, err := q.GetCategoryByID(ctx, p.CategoryID)
			if err != nil {
				continue
			}
			cat = row
			categoryCache[p.CategoryID] = cat
		}
		parentSlug := cat.Slug
		if cat.ParentID != nil && !cat.ParentID.IsZero() {
			parent, err := q.GetCategoryByID(ctx, *cat.ParentID)
			if err == nil {
				parentSlug = parent.Slug
			}
		}
		parentSlugByProduct[p.ID] = parentSlug
		if p.Featured != 0 {
			featuredByParent[parentSlug] = true
		}
	}

	for _, parentSlug := range catalog.OrderedParents {
		if featuredByParent[parentSlug] {
			continue
		}
		if featuredCount >= models.ProductFeaturedLimit {
			break
		}
		for _, p := range products {
			if parentSlugByProduct[p.ID] != parentSlug || p.Featured != 0 {
				continue
			}
			if err := withDBRetry(ctx, db, cfg, func(q *sqlc.Queries) error {
				return q.SetProductFeatured(ctx, sqlc.SetProductFeaturedParams{
					Featured: 1,
					ID:       p.ID,
				})
			}); err != nil {
				return err
			}
			featuredByParent[parentSlug] = true
			featuredCount++
			log.Printf("Featured product for category %q (vendor product %s)", parentSlug, p.ID.String())
			break
		}
	}
	return nil
}
