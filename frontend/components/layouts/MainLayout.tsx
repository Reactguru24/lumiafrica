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
import { SupportChatButton } from '@/components/common/SupportChatButton'
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
  const wishlistCount = useCartStore((s) => s.wishlist.length)
  const showGuestLinks = hasHydrated && !isAuthenticated
  const showAuthLinks = hasHydrated && isAuthenticated
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)

  useEffect(() => {
    router.prefetch('/auth/login')
    router.prefetch('/auth/register')
  }, [router])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] max-w-72 h-dvh flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <AppLogo size="sm" />
            <button type="button" className="p-2" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        </aside>
      </header>

      <main className="flex-1 relative">
        {children}
        {isCustomer && <SupportChatButton />}
      </main>

      <footer className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 py-8 sm:py-12 mt-auto border-t border-gray-200 dark:border-gray-800">
        <div className="page-width grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <AppLogo light className="mb-4" />
            <p className="text-xs sm:text-sm">East Africa&apos;s premier fashion marketplace — shop Kenya, Uganda, Tanzania & beyond.</p>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-white font-medium mb-3 text-sm sm:text-base">Shop</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><Link href="/products" className="hover:text-gray-900 dark:hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/products?newArrival=true&sort=newest" className="hover:text-gray-900 dark:hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/products?trending=true" className="hover:text-gray-900 dark:hover:text-white transition-colors">Trending</Link></li>
              <li><Link href="/products?onSale=true" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sale</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-white font-medium mb-3 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>Fast Shipping</li>
              <li>Easy Returns</li>
              <li>M-Pesa Payments</li>
              <li>Verified Vendors</li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-white font-medium mb-3 text-sm sm:text-base">Sell</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {showGuestLinks && (
                <li><Link href="/auth/apply-vendor" className="hover:text-gray-900 dark:hover:text-white transition-colors">Apply to Sell</Link></li>
              )}
              {showAuthLinks && isVendor && (
                <li><Link href="/vendor" className="hover:text-gray-900 dark:hover:text-white transition-colors">Seller Dashboard</Link></li>
              )}
              {showAuthLinks && isAdmin && (
                <li><Link href="/admin" className="hover:text-gray-900 dark:hover:text-white transition-colors">Admin Panel</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 dark:text-white font-medium mb-3 text-sm sm:text-base">Contact</h4>
            <ul className="space-y-2 text-xs sm:text-sm mb-4">
              <li>
                <a href="mailto:hello@lumiafrica.com" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  hello@lumiafrica.com
                </a>
              </li>
              <li>
                <a href="tel:+254000000000" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  +254 000 000 000
                </a>
              </li>
              <li className="text-gray-500">Nairobi, Kenya</li>
            </ul>
            <div className="flex items-center gap-3">
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" aria-label="TikTok" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              {/* X / Twitter */}
              <a href="#" aria-label="X (Twitter)" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* WhatsApp */}
              <a href="#" aria-label="WhatsApp" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="page-width mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
        <Link href="/account/wishlist" className={`relative flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.wishlist)}`}>
          <HeartIcon className={`w-5 h-5 ${activeNav.wishlist ? 'text-brand-teal dark:text-brand-orange' : ''}`} />
          {wishlistCount > 0 && (
            <span className="absolute top-0.5 right-1 min-w-[1rem] h-4 px-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
          Wishlist
        </Link>
        <Link href={accountHref(isAuthenticated, isCustomer, isVendor, isAdmin)} className={`flex flex-col items-center p-2 text-[10px] gap-0.5 min-w-[3.5rem] ${navClass(activeNav.account)}`}>
          <UserIcon className={`w-5 h-5 ${activeNav.account ? 'text-brand-teal dark:text-brand-orange' : ''}`} />Account
        </Link>
      </nav>
      <div className="h-16 md:hidden" />
    </div>
  )
}
