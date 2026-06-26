package catalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"lumi-backend/internal/database/sqlc"
	"lumi-backend/internal/database/types"
	"lumi-backend/internal/utils"
)

// OrderedParents keeps category presentation stable across API responses and UI.
var OrderedParents = []string{"men", "women", "kids", "accessories", "footwear"}

// Tree is the canonical category → subcategory map (matches the vendor product form).
var Tree = map[string][]string{
	"men":         {"t-shirts", "shirts", "hoodies", "jackets", "jeans", "trousers", "suits"},
	"women":       {"dresses", "tops", "blouses", "skirts", "jeans", "jackets"},
	"kids":        {"boys", "girls", "baby-wear"},
	"accessories": {"bags", "belts", "caps", "watches", "sunglasses"},
	"footwear":    {"sneakers", "boots", "sandals", "heels"},
}

func Categories() []string {
	out := make([]string, 0, len(OrderedParents))
	out = append(out, OrderedParents...)
	return out
}

func SubcategoriesByCategory() map[string][]string {
	out := make(map[string][]string, len(Tree))
	for _, parent := range OrderedParents {
		children := Tree[parent]
		out[parent] = append([]string(nil), children...)
	}
	return out
}

func FlatSubcategories() []string {
	var out []string
	for _, parent := range OrderedParents {
		out = append(out, Tree[parent]...)
	}
	return out
}

func ChildSlug(parent, child string) string {
	return parent + "-" + child
}

func IsValidPair(category, subcategory string) bool {
	children, ok := Tree[category]
	if !ok {
		return false
	}
	for _, c := range children {
		if c == subcategory {
			return true
		}
	}
	return false
}

func slugToName(slug string) string {
	parts := strings.Split(slug, "-")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func ExpectedCount() int {
	n := 0
	for _, children := range Tree {
		n++
		n += len(children)
	}
	return n
}

// EnsureTree creates any missing parent/child category rows. Safe to call on every startup.
func EnsureTree(ctx context.Context, q *sqlc.Queries) error {
	sortOrder := int32(0)
	for parentSlug, children := range Tree {
		sortOrder++
		parentID, err := ensureCategory(ctx, q, parentSlug, slugToName(parentSlug), nil, sortOrder)
		if err != nil {
			return fmt.Errorf("ensure category %q: %w", parentSlug, err)
		}
		childOrder := int32(0)
		for _, child := range children {
			childOrder++
			pid := parentID
			childSlug := ChildSlug(parentSlug, child)
			name := slugToName(parentSlug) + " " + slugToName(child)
			if _, err := ensureCategory(ctx, q, childSlug, name, &pid, childOrder); err != nil {
				return fmt.Errorf("ensure subcategory %q: %w", childSlug, err)
			}
		}
	}
	return nil
}

func ensureCategory(
	ctx context.Context,
	q *sqlc.Queries,
	slug, name string,
	parentID *types.BinaryUUID,
	sortOrder int32,
) (types.BinaryUUID, error) {
	row, err := q.GetCategoryBySlug(ctx, slug)
	if err == nil {
		return row.ID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return types.BinaryUUID{}, err
	}
	id := utils.GenerateBinaryID()
	if err := q.CreateCategory(ctx, sqlc.CreateCategoryParams{
		ID:        id,
		Name:      name,
		Slug:      slug,
		ParentID:  parentID,
		SortOrder: sortOrder,
	}); err != nil {
		return types.BinaryUUID{}, err
	}
	return id, nil
}

// ResolveCategoryID looks up the leaf category row for a validated parent/child pair.
func ResolveCategoryID(ctx context.Context, q *sqlc.Queries, category, subcategory string) (types.BinaryUUID, error) {
	if !IsValidPair(category, subcategory) {
		return types.BinaryUUID{}, fmt.Errorf("invalid category/subcategory combination")
	}
	child, err := q.GetCategoryBySlug(ctx, ChildSlug(category, subcategory))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return types.BinaryUUID{}, fmt.Errorf("invalid subcategory")
		}
		return types.BinaryUUID{}, err
	}
	parent, err := q.GetCategoryBySlug(ctx, category)
	if err != nil {
		return types.BinaryUUID{}, fmt.Errorf("invalid category")
	}
	if child.ParentID == nil || *child.ParentID != parent.ID {
		return types.BinaryUUID{}, fmt.Errorf("invalid category/subcategory combination")
	}
	return child.ID, nil
}
