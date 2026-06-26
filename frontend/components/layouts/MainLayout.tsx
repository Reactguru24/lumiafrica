'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  MagnifyingGlassIcon, ShoppingBagIcon, UserIcon, Bars3Icon, XMarkIcon,
  HomeIcon, Squares2X2Icon, HeartIcon,
} from '@heroicons/react/24/outline'
import { AppLogo } from '@/components/common/AppLogo'
import { AppearanceControls } from '@/components/common/AppearanceControls'
import { UserAvatar } from '@/components/account/UserAvatar'
import { UserMenu } from '@/components/common/UserMenu'
import { VendorModeToggle } from '@/components/vendor/VendorModeToggle'
import { SHOP_CATEGORIES, shopCategoryQuery, shopSubcategoryQuery } from '@/lib/constants/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'

function accountHref(isAuthenticated: boolean, isCustomer: boolean, isVendor: boolean, isAdmin: boolean): string {
  if (!isAuthenticated) return '/auth/login'
  if (isVendor) return '/vendor/account'
  if (isCustomer) return '/account'
  if (isAdmin) return '/admin'
  return '/auth/login'
}

export function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const user = useAuthStore((s) => s.user)
  const isCustomer = useAuthStore((s) => s.isCustomer)
  const isVendor = useAuthStore((s) => s.isVendor)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isApplicant = useAuthStore((s) => s.isApplicant)
  const logout = useAuthStore((s) => s.logout)
  const itemCount = useCartStore((s) => s.itemCount)
  const showGuestLinks = hasHydrated && !isAuthenticated
  const showAuthLinks = hasHydrated && isAuthenticated
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)

  useEffect(() => {
    router.prefetch('/auth/login')
    router.prefetch('/auth/register')
  }, [router])

  function search() {
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  function goToProducts(query: Record<string, string>) {
    const params = new URLSearchParams(query)
    router.push(`/products?${params.toString()}`)
    setMegaMenuOpen(false)
    setMobileMenuOpen(false)
  }

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  const activeNav = useMemo(() => ({
    home: pathname === '/',
    shop: pathname === '/products' || pathname.startsWith('/products/'),
    wishlist: pathname === '/account/wishlist',
    cart: pathname === '/cart' || pathname === '/checkout',
    account: pathname.startsWith('/account') || pathname.startsWith('/vendor/account') || pathname.startsWith('/vendor') || pathname.startsWith('/auth'),
  }), [pathname])

  function navClass(active: boolean) {
    return active ? 'text-brand-teal dark:text-brand-orange font-semibold' : 'text-gray-500 dark:text-gray-400'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="page-width">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <button className="lg:hidden p-2 shrink-0" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>

            <AppLogo size="sm" className="lg:mr-8 shrink-0 min-w-0" />

            <nav className="hidden lg:flex items-center gap-8 flex-1">
              <div className="relative" onMouseEnter={() => setMegaMenuOpen(true)} onMouseLeave={() => setMegaMenuOpen(false)}>
                <Link href="/products" className="text-sm font-medium tracking-wide hover:underline">SHOP</Link>
                {megaMenuOpen && (
                  <div className="absolute top-full left-0 w-[640px] card p-6 shadow-xl mt-0 grid grid-cols-3 gap-6 z-50">
                    {Object.entries(SHOP_CATEGORIES).map(([cat, config]) => (
                      <div key={cat}>
                        <button className="font-semibold text-sm mb-3 hover:underline text-left w-full" onClick={() => goToProducts(shopCategoryQuery(cat) as Record<string, string>)}>{cat}</button>
                        <ul className="space-y-1">
                          {config.items.map((item) => (
                            <li key={item}>
                              <button className="text-sm text-gray-500 hover:text-brand-teal dark:hover:text-brand-orange text-left" onClick={() => goToProducts(shopSubcategoryQuery(cat, item) as Record<string, string>)}>{item}</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/products" className="text-sm font-medium tracking-wide hover:underline">ALL PRODUCTS</Link>
              <Link href="/products?newArrival=true&sort=newest" className="text-sm font-medium tracking-wide hover:underline">NEW IN</Link>
              <Link href="/products?trending=true" className="text-sm font-medium tracking-wide hover:underline">TRENDING</Link>
              <Link href="/products?onSale=true" className="text-sm font-medium tracking-wide hover:underline text-brand-orange">SALE</Link>
            </nav>

            <div className="hidden lg:flex items-center shrink-0">
              {showAuthLinks && isVendor && <VendorModeToggle compact />}
            </div>

            <form className="hidden md:flex items-center flex-1 max-w-xs mx-4" onSubmit={(e) => { e.preventDefault(); search() }}>
              <div className="relative w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder="Search fashion..." className="input-field pl-10 py-2 text-sm" />
              </div>
            </form>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <AppearanceControls />
              {showAuthLinks ? (
                <UserMenu />
              ) : showGuestLinks ? (
                <Link href="/auth/login" className="hidden md:block text-sm font-medium">Sign In</Link>
              ) : null}
              <Link href="/cart" className="relative p-2">
                <ShoppingBagIcon className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center">{itemCount}</span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 p-4 space-y-4 animate-slide-up">
            <form onSubmit={(e) => { e.preventDefault(); search() }} className="flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder="Search..." className="input-field flex-1 py-2 text-sm" />
              <button type="submit" className="btn-primary py-2 px-4 text-sm">Go</button>
            </form>
            <Link href="/products" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>All Products</Link>
            <Link href="/products?newArrival=true&sort=newest" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>New In</Link>
            <Link href="/products?trending=true" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Trending</Link>
            <Link href="/products?onSale=true" className="block text-sm font-medium text-brand-orange" onClick={() => setMobileMenuOpen(false)}>Sale</Link>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
              <p className="micro-label mb-2">Categories</p>
              {Object.keys(SHOP_CATEGORIES).map((cat) => (
                <button key={cat} className="block text-sm py-1 hover:underline" onClick={() => goToProducts(shopCategoryQuery(cat) as Record<string, string>)}>{cat}</button>
              ))}
            </div>
            {showGuestLinks && (
              <>
                <Link href="/auth/login" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                <Link href="/auth/register" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Register</Link>
              </>
            )}
            {showAuthLinks && isVendor && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                <VendorModeToggle className="w-full justify-center" />
              </div>
            )}
            {showAuthLinks && user && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <UserAvatar fullName={user.fullName} avatar={user.avatar} size="sm" className="w-9 h-9" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.fullName?.trim() || user.email || 'User'}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Signed in</p>
                  </div>
                </div>
                {isApplicant && (
                  <Link href="/application-submitted" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Application Status</Link>
                )}
                {isCustomer && (
                  <>
                    <Link href="/account" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
                    <Link href="/account/orders" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                  </>
                )}
                {isVendor && (
                  <Link href="/vendor/account" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="block text-sm font-medium text-brand-teal dark:text-brand-orange" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>
                )}
                <button className="block text-sm font-medium text-red-600" onClick={handleLogout}>Sign Out</button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-8 sm:py-12 mt-auto">
        <div className="page-width grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <AppLogo light className="mb-4" />
            <p className="text-xs sm:text-sm">East Africa&apos;s premier fashion marketplace — shop Kenya, Uganda, Tanzania & beyond.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Shop</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><Link href="/products" className="hover:text-white">All Products</Link></li>
              <li><Link href="/products?newArrival=true&sort=newest" className="hover:text-white">New Arrivals</Link></li>
              <li><Link href="/products?trending=true" className="hover:text-white">Trending</Link></li>
              <li><Link href="/products?onSale=true" className="hover:text-white">Sale</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>Fast Shipping</li>
              <li>Easy Returns</li>
              <li>M-Pesa Payments</li>
              <li>Verified Vendors</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Sell</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {showGuestLinks && (
                <li><Link href="/auth/apply-vendor" className="hover:text-white">Apply to Sell</Link></li>
              )}
              {showAuthLinks && isVendor && (
                <li><Link href="/vendor" className="hover:text-white">Seller Dashboard</Link></li>
              )}
              {showAuthLinks && isAdmin && (
                <li><Link href="/admin" className="hover:text-white">Admin Panel</Link></li>
              )}
            </ul>
          </div>
        </div>
        <div className="page-width mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800 text-center text-xs sm:text-sm">
          &copy; 2026 LumiAfrica. All rights reserved.
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex justify-around py-1.5 safe-bottom">
        <Link href="/" className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.home)}`}>
          <HomeIcon className={`w-5 h-5 ${activeNav.home ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Home
        </Link>
        <Link href="/products" className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.shop)}`}>
          <Squares2X2Icon className={`w-5 h-5 ${activeNav.shop ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Shop
        </Link>
        <Link href="/account/wishlist" className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.wishlist)}`}>
          <HeartIcon className={`w-5 h-5 ${activeNav.wishlist ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Wishlist
        </Link>
        <Link href="/cart" className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] relative ${navClass(activeNav.cart)}`}>
          <ShoppingBagIcon className={`w-5 h-5 ${activeNav.cart ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Cart
          {itemCount > 0 && <span className="absolute top-0.5 right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{itemCount}</span>}
        </Link>
        <Link href={accountHref(isAuthenticated, isCustomer, isVendor, isAdmin)} className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.account)}`}>
          <UserIcon className={`w-5 h-5 ${activeNav.account ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Account
        </Link>
      </nav>
      <div className="h-16 md:hidden" />
    </div>
  )
}
