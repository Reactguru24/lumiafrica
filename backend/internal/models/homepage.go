package models

type HomepageHeroSlideResponse struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Image    string `json:"image"`
	Link     string `json:"link"`
	SortOrder int   `json:"sortOrder"`
	Active   bool   `json:"active"`
}

type HomepagePromoItemResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sortOrder"`
	Active      bool   `json:"active"`
}

type HomepageBannerResponse struct {
	ID       string `json:"id"`
	Title    string `json:"title,omitempty"`
	Subtitle string `json:"subtitle,omitempty"`
	Image    string `json:"image"`
	Link     string `json:"link,omitempty"`
	Active   bool   `json:"active"`
	SortOrder int   `json:"sortOrder"`
}

type HomepageContentResponse struct {
	HeroSlides []HomepageHeroSlideResponse `json:"heroSlides"`
	PromoItems []HomepagePromoItemResponse `json:"promoItems"`
	Banner     *HomepageBannerResponse     `json:"banner,omitempty"`
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

type CreateHomepageBannerRequest struct {
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle"`
	Image     string `json:"image" binding:"required"`
	Link      string `json:"link"`
	SortOrder int    `json:"sortOrder"`
	Active    bool   `json:"active"`
}

type UpdateHomepageBannerRequest struct {
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle"`
	Image     string `json:"image" binding:"required"`
	Link      string `json:"link"`
	SortOrder int    `json:"sortOrder"`
}
