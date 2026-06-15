'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { RouteGuard } from '@/components/layouts/RouteGuard'

export default function UnauthorizedPage() {
  const router = useRouter()
  const auth = useAuthStore()

  const roleLabel = auth.role === 'ADMIN' ? 'Administrator' : auth.role === 'VENDOR' ? 'Vendor/Seller' : auth.role === 'CUSTOMER' ? 'Customer' : 'Unknown'

  async function logout() {
    await auth.logout()
    router.push('/auth/login')
  }

  return (
    <RouteGuard requiresAuth>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7" /></svg>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Access Denied</p>
          <p className="text-gray-600 dark:text-gray-400 mb-8">You don&apos;t have permission to access this page.</p>
          {auth.role && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Your Role:</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">{roleLabel}</span>
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Link href={auth.getDashboardRoute()} className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200">Go to Dashboard</Link>
            <Link href="/" className="block w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 rounded-lg transition duration-200">Back to Home</Link>
            <button onClick={logout} className="w-full text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold py-3 transition duration-200">Logout</button>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
