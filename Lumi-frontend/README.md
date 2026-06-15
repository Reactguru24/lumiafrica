# 🛍️ LumiAfrica — Multi-Vendor Fashion Marketplace

A modern, production-ready eCommerce platform for fashion and clothing brands across East Africa. Built with Next.js 15, React 19, and TypeScript.

**Live Features**: Full storefront, multi-vendor support, admin dashboard, vendor analytics, subscription management, and advanced product discovery.

---

## ✨ Key Features

### For Customers
- 🛒 Browse 1000+ products from verified vendors
- 💳 Multiple payment methods (M-Pesa, Visa, Mastercard, Airtel Money)
- ❤️ Wishlist & cart management
- 📱 Mobile-first responsive design
- 🚚 Real-time order tracking
- 💬 Vendor reviews & ratings
- 🎯 Advanced product filters & search

### For Vendors
- 📊 Analytics dashboard with sales insights
- 📦 Inventory management system
- 📈 Featured listing subscriptions (monthly/quarterly/yearly)
- ⭐ Vendor reviews & analytics
- 🎨 Customizable storefront profile
- 💰 Revenue tracking & reports

### For Admins
- 👥 User & vendor management
- 📋 Order monitoring & fulfillment
- 💼 Subscription management
- 📊 Platform analytics & insights
- 🛠️ System settings & configuration

---

## 🚀 Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| **State Management** | Zustand (auth, cart, theme, currency) |
| **Data** | Mock data layer with localStorage persistence |
| **UI Components** | Heroicons · Sonner (toasts) · Custom components |
| **Validation** | Zod schema validation |
| **Charts** | Chart.js for analytics |
| **Containerization** | Docker & Docker Compose |

---

## 🏗️ Architecture

### Data Layer
- **Local-first design**: All data stored in-memory + localStorage
- **Event-driven updates**: Components re-render via subscription system
- **Hydration-safe**: `useHydration()` hook prevents server/client mismatches
- **Real-time sync**: Changes instantly reflected across all pages

### Role-Based Access
- **ADMIN**: Full platform access (`/admin`)
- **VENDOR**: Vendor dashboard & inventory (`/vendor`)
- **CUSTOMER**: Storefront & account (`/`, `/account`)
- **GUEST**: Browse products, no checkout

---

## 📋 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd lumiweb

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 👨‍💼 Admin | `admin@lumiafrica.com` | `admin123` |
| 🛍️ Customer | `customer@lumiafrica.com` | `customer123` |
| 🏪 Vendor | `vendor@lumiafrica.com` | `vendor123` |

---

## 🐳 Docker Setup

```bash
# Build and run with Docker Compose
docker compose up --build

# Access at http://localhost:3000
```

**Docker features**: 
- Automatic rebuild on code changes
- Volume mounts for development
- Pre-configured Next.js port

---

## 📁 Project Structure

```
app/
├── (storefront)/          # Customer-facing pages
│   ├── page.tsx           # Homepage
│   ├── products/          # Product browsing
│   ├── account/           # Customer dashboard
│   └── checkout/          # Order creation
├── admin/                 # Admin dashboard
│   ├── orders/            # Order management
│   ├── products/          # Product admin
│   ├── users/             # User management
│   ├── vendors/           # Vendor management
│   └── subscriptions/     # Subscription management
├── vendor/                # Vendor dashboard
│   ├── products/          # Vendor inventory
│   ├── orders/            # Vendor order view
│   ├── analytics/         # Sales analytics
│   └── profile/           # Vendor profile
├── auth/                  # Authentication
│   ├── login/
│   └── register/
└── api/                   # API routes (if needed)

components/
├── layouts/               # Page layouts
│   ├── MainLayout.tsx     # Customer layout
│   ├── AdminLayout.tsx    # Admin layout
│   └── VendorLayout.tsx   # Vendor layout
├── common/                # Shared components
│   ├── StatusBadge.tsx
│   ├── Pagination.tsx
│   ├── ResponsiveDataTable.tsx
│   └── ...
├── product/               # Product-specific
│   ├── ProductCard.tsx
│   └── ProductFiltersPanel.tsx
└── charts/                # Analytics
    ├── LineChart.tsx
    └── BarChart.tsx

lib/
├── data/
│   ├── services.ts        # Data layer (CRUD operations)
│   ├── database.ts        # In-memory DB
│   ├── hooks.ts           # useLocalData, useHydration
│   └── seed.ts            # Sample data generator
├── stores/                # Zustand stores
│   ├── auth.ts            # Authentication state
│   ├── cart.ts            # Shopping cart
│   ├── theme.ts           # Dark mode
│   └── currency.ts        # Currency selection
├── types/                 # TypeScript interfaces
│   └── index.ts
├── hooks/                 # React hooks
│   ├── useRouteGuard.ts
│   ├── usePagination.ts
│   └── usePermissions.ts
├── utils/
│   ├── validation.ts      # Zod schemas
│   ├── storage.ts         # Helpers
│   ├── productFilters.ts
│   └── subscriptions.ts
└── constants/
    ├── navigation.ts
    ├── commerce.ts
    └── subscriptions.ts

public/                   # Static assets
tailwind.config.js        # Tailwind configuration
tsconfig.json            # TypeScript config
```

---

## 🔐 Authentication Flow

1. **Login/Register**: Email & password validation
2. **Session Management**: Stored in localStorage
3. **Role-based Routes**: RouteGuard component enforces access control
4. **Auto-logout**: Sessions expire after 24 hours

---

## 🛒 Order Flow

```
Customer adds items → Cart → Checkout → Order Creation → Admin/Vendor View
```

**Order Status**: `pending` → `processing` → `shipped` → `delivered` (or `cancelled`)

---

## 💾 Data Persistence

- **In-Memory**: Fast reads/writes during session
- **localStorage**: Data persists across page reloads
- **Automatic Sync**: Changes trigger re-renders via event system

**Hydration**: `useHydration()` ensures client-side code only accesses localStorage after page hydration.

---

## 🎨 Theming

**Supports**: Light & Dark modes

```typescript
// Theme toggle in header
<ThemeToggle />

// Access current theme
const theme = useThemeStore(state => state.theme)
```

---

## 📊 Admin Dashboard Features

### Orders Tab
- Real-time order monitoring
- Status tracking (pending, processing, shipped, delivered)
- Order statistics & revenue tracking
- Quick status updates

### Vendors Tab
- Vendor approval workflow
- Subscription management
- Vendor analytics
- Commission tracking

### Subscriptions Tab
- Featured listing subscriptions
- Plan management (monthly, quarterly, biannual, yearly)
- Active subscriber tracking
- Revenue analytics

### Products Tab
- Bulk product management
- Inventory tracking
- Price & discount management

---

## 🧪 Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npx tsc --noEmit
```

### Code Quality

- TypeScript strict mode enabled
- Zod runtime validation
- ESLint configured

---

## ⚠️ Known Limitations

- **Mock Data**: Uses localStorage, not a real database
- **Payments**: Payment methods are simulated (no real gateway integration)
- **Inventory**: Stock levels not automatically managed
- **Real-time**: No live updates across multiple users
- **Email**: No email notifications system

**For Production**: Replace mock data layer with proper backend API

---

## 🚀 Future Enhancements

- [ ] Backend API integration (Node.js/Express/Prisma)
- [ ] Real payment gateway (Stripe/M-Pesa API)
- [ ] Email notifications (Resend/SendGrid)
- [ ] Real-time features (WebSockets)
- [ ] Inventory management system
- [ ] Advanced analytics & reporting
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m "Add amazing feature"`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 💡 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for East Africa's fashion community**
