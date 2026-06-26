import type { ReactNode } from 'react'
import { AppLogo } from '@/components/common/AppLogo'
import { AppearanceControls } from '@/components/common/AppearanceControls'

export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 h-full shrink-0 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-teal via-gray-900 to-brand-900" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <AppLogo size="lg" light className="mb-4" />
          <p className="micro-label !text-brand-orange mb-3">East Africa&apos;s Fashion Hub</p>
          <h2 className="font-display text-4xl font-semibold mb-4">Style Rooted in Africa</h2>
          <p className="text-gray-300 max-w-md">Discover premium fashion from Kenyan and East African vendors. Shop the latest trends or start selling your brand on LumiAfrica.</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-gray-950">
        <div className="flex shrink-0 justify-between items-center p-6">
          <AppLogo className="lg:hidden" />
          <AppearanceControls />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className={`flex min-h-full justify-center px-6 pb-12 ${wide ? 'items-start py-6' : 'items-center'}`}>
            <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
