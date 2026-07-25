'use client'

import Link from 'next/link'
import { SupportChatButton } from '@/components/common/SupportChatButton'
import { useAuthStore } from '@/lib/stores/auth'

export default function SupportPage() {
  const isCustomer = useAuthStore((s) => s.isCustomer)

  return (
    <div className="page-width py-8 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Customer Support</p>
                <h1 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">Chat with customer support</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Use this space to send complaints, feedback, or questions about your order or experience. This is not for product reviews.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-6 text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Start a new conversation</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Our support team is available during business hours to help with any issue.</p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/support/chat" className="btn-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold">
                  Open chat
                </Link>
                <a href="mailto:hello@lumiafrica.com" className="text-sm text-brand-teal hover:text-brand-orange dark:hover:text-brand-orange">
                  Email support
                </a>
              </div>
            </div>

            {!isCustomer && (
              <div className="rounded-3xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-5 text-sm text-gray-600 dark:text-gray-300">
                Only customers can use the chat support feature. Vendors and admins should use internal support tools or the admin support page.
              </div>
            )}
          </div>
        </div>
      </div>
      {isCustomer && <SupportChatButton />}
    </div>
  )
}
