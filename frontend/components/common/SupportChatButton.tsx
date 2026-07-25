'use client'

import { useState } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'

export function SupportChatButton() {
  const auth = useAuthStore()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const name = auth.user?.fullName ?? ''
  const email = auth.user?.email ?? ''
  const phone = auth.user?.phone ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/support/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      })
      if (!res.ok) throw new Error('Network error')
      toast.success('Message sent — our support team will respond via email')
      setSubject('')
      setMessage('')
      setOpen(false)
    } catch (err) {
      toast.error('Unable to send message. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed left-4 bottom-[5.5rem] z-50 md:bottom-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat support"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-white shadow-[0_10px_30px_rgba(251,146,60,0.24)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-900">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Chat with support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Send complaints or feedback — not product reviews. We'll reply via email.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={name} readOnly placeholder="Name" className="input-field bg-gray-50 dark:bg-gray-800" />
                <input value={email} readOnly placeholder="Email" className="input-field bg-gray-50 dark:bg-gray-800" />
              </div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" className="input-field" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Describe your issue or feedback" className="input-field" />

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm">
                  {loading ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
