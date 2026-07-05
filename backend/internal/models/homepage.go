package models

type HomepageHeroSlideResponse struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle,omitempty"`
	Image     string `json:"image"`
	Link      string `json:"link"`
	SortOrder int    `json:"sortOrder"`
	Active    bool   `json:"active"`
}

type HomepagePromoItemResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sortOrder"`
	Active      bool   `json:"active"`
}

type HomepageShowcaseResponse struct {
	ID              string   `json:"id,omitempty"`
	Overline        string   `json:"overline"`
	Headline        string   `json:"headline"`
	Description     string   `json:"description"`
	ButtonText      string   `json:"buttonText"`
	ButtonLink      string   `json:"buttonLink"`
	BackgroundColor string   `json:"backgroundColor"`
	Images          []string `json:"images"`
	Active          bool     `json:"active"`
}

type HomepageContentResponse struct {
	HeroSlides []HomepageHeroSlideResponse `json:"heroSlides"`
	PromoItems []HomepagePromoItemResponse `json:"promoItems"`
	Showcase   *HomepageShowcaseResponse   `json:"showcase,omitempty"`
}

type CreateHomepageHeroSlideRequest struct {
	Label     string `json:"label"`
	Title     string `json:"title" binding:"required"`
	Subtitle  string `json:"subtitle"`
	Image     string `json:"image" binding:"required"`
	Link      string `json:"link"`
	SortOrder int    `json:"sortOrder"`
}

type UpdateHomepageHeroSlideRequest struct {
	Label     string `json:"label"`
	Title     string `json:"title" binding:"required"`
	Subtitle  string `json:"subtitle"`
	Image     string `json:"image" binding:"required"`
	Link      string `json:"link"`
	SortOrder int    `json:"sortOrder"`
}

type CreateHomepagePromoItemRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sortOrder"`
}

type UpdateHomepagePromoItemRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sortOrder"`
}

type UpsertHomepageShowcaseRequest struct {
	Overline        string   `json:"overline"`
	Headline        string   `json:"headline" binding:"required"`
	Description     string   `json:"description"`
	ButtonText      string   `json:"buttonText"`
	ButtonLink      string   `json:"buttonLink"`
	BackgroundColor string   `json:"backgroundColor"`
	Images          []string `json:"images"`
	Active          bool     `json:"active"`
}
