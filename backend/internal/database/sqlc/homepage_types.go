package sqlc

import (
    "database/sql"
    "time"

    "github.com/Reactguru24/lumiafrica/internal/database/types"
)

// HomepageHeroSlide mirrors the homepage_hero_slides table
type HomepageHeroSlide struct {
    ID        types.BinaryUUID `json:"id"`
    Label     string           `json:"label"`
    Title     string           `json:"title"`
    Subtitle  sql.NullString   `json:"subtitle"`
    Image     string           `json:"image"`
    Link      string           `json:"link"`
    SortOrder int32            `json:"sort_order"`
    Active    int16            `json:"active"`
    CreatedAt time.Time        `json:"created_at"`
    UpdatedAt time.Time        `json:"updated_at"`
}

// HomepagePromoItem mirrors the homepage_promo_items table
type HomepagePromoItem struct {
    ID          types.BinaryUUID `json:"id"`
    Title       string           `json:"title"`
    Description string           `json:"description"`
    Icon        string           `json:"icon"`
    SortOrder   int32            `json:"sort_order"`
    Active      int16            `json:"active"`
    CreatedAt   time.Time        `json:"created_at"`
    UpdatedAt   time.Time        `json:"updated_at"`
}

// HomepageShowcase mirrors the homepage_showcase table
type HomepageShowcase struct {
    ID              types.BinaryUUID `json:"id"`
    Overline        string           `json:"overline"`
    Headline        string           `json:"headline"`
    Description     string           `json:"description"`
    ButtonText      string           `json:"button_text"`
    ButtonLink      string           `json:"button_link"`
    BackgroundColor string           `json:"background_color"`
    Image1          string           `json:"image_1"`
    Image2          string           `json:"image_2"`
    Image3          string           `json:"image_3"`
    Image4          string           `json:"image_4"`
    Active          int16            `json:"active"`
    CreatedAt       time.Time        `json:"created_at"`
    UpdatedAt       time.Time        `json:"updated_at"`
}
