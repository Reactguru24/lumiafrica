# Lumi Africa — Frontend

Next.js 15 storefront, vendor dashboard, and admin panel for the Lumi fashion marketplace.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS** · **Zustand** (auth, cart, theme, currency)
- **REST client** → Go backend (`NEXT_PUBLIC_API_URL`)

## Setup

```bash
cd frontend
npm install

# Point at the API (create .env.local if needed)
echo 'NEXT_PUBLIC_API_URL=http://localhost:8080' > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running on port 8080.

## Project structure

```
frontend/
├── app/
│   ├── (storefront)/     # Shop, products, cart, checkout, account
│   ├── admin/            # Admin dashboard
│   ├── vendor/           # Vendor dashboard
│   └── auth/             # Login, register, password reset
├── components/           # UI components
├── lib/
│   ├── api/              # client.ts + hooks.ts (useProducts, etc.)
│   ├── stores/           # Zustand (auth, cart, theme, currency)
│   ├── types/
│   └── utils/            # productFilters.ts, errors, etc.
└── public/
```

## Data fetching

Hooks in `lib/api/hooks.ts` wrap the API client:

- `useProducts(params)` — catalog search
- `useHomepageProducts()` — homepage collections (single request)
- `useProduct`, `useVendors`, `useFeaturedVendors`, etc.

**Stale-while-revalidate:** when filters or sort change, the previous product list stays visible while the new request runs (`isRefetching`). Only the first load shows a full-page spinner. This avoids the “frozen UI” feeling on every filter click.

## Product filters

Filter state is synced with the URL (`/products?category=men&sort=rating`). Shared helpers in `lib/utils/productFilters.ts`:

- `filtersFromQuery()` — URL → state
- `queryFromFilters()` — state → URL query string
- `filtersToAPIParams()` — state → backend query params

## Auth

- Session token in `localStorage` (`session` key)
- `refreshUser()` skips `/auth/me` for guests (no token)
- `RouteGuard` protects admin/vendor routes

## Routes

| Area | Path |
|------|------|
| Home | `/` |
| Products | `/products` |
| Cart / Checkout | `/cart`, `/checkout` |
| Account | `/account` |
| Vendor | `/vendor/*` |
| Admin | `/admin/*` |
| Auth | `/auth/login`, `/auth/register` |

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Performance tips

1. **Local API latency** — filter changes call `GET /products`; localhost is usually fast but MySQL + complex sorts can take 100–300ms.
2. **Network tab** — verify requests hit `localhost:8080`, not a wrong `NEXT_PUBLIC_API_URL`.
3. **Homepage** — uses one batched `/products/homepage` call instead of four separate list requests.

## License

MIT
