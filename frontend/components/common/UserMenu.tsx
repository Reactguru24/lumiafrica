'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { UserAvatar } from '@/components/account/UserAvatar'
import { VendorModeToggle } from '@/components/vendor/VendorModeToggle'
import { useAuthStore } from '@/lib/stores/auth'

export function getInitials(fullName?: string | null): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isApplicant = useAuthStore((s) => s.isApplicant)
  const isCustomer = useAuthStore((s) => s.isCustomer)
  const isVendor = useAuthStore((s) => s.isVendor)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  const displayName = user.fullName?.trim() || user.email || 'User'

  async function handleLogout() {
    setOpen(false)
    await logout()
    router.push('/')
  }

  return (
    <div className="relative hidden md:block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar fullName={user.fullName} avatar={user.avatar} size="sm" />
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 card shadow-xl p-2 z-50 animate-fade-in">
          <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <UserAvatar fullName={user.fullName} avatar={user.avatar} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">Signed in</p>
          </div>

          {isVendor && (
            <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
              <VendorModeToggle className="w-full" compact />
            </div>
          )}

          <div className="py-1">
            {isApplicant && (
              <Link href="/application-submitted" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>Application Status</Link>
            )}
            {isCustomer && (
              <>
                <Link href="/account" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>My Account</Link>
                <Link href="/account/orders" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>My Orders</Link>
                <Link href="/account/wishlist" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>Wishlist</Link>
              </>
            )}
            {isVendor && (
              <Link href="/vendor/account" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>My Account</Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md" onClick={() => setOpen(false)}>Admin Panel</Link>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
