'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyVendorApplicationRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/apply-vendor')
  }, [router])

  return (
    <div className="text-center py-16 text-gray-500 text-sm">
      Redirecting to vendor application…
    </div>
  )
}
