'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'

type Message = { id: string; sender: 'customer' | 'support' | 'system'; text: string; ts: string }

export function SupportChatButton() {
  const auth = useAuthStore()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const isAuthenticated = auth.isAuthenticated
  const namePrefill = auth.user?.fullName ?? ''
  const emailPrefill = auth.user?.email ?? ''

  const [guestName, setGuestName] = useState<string>(() => {
    try { return localStorage.getItem('support_guest_name') ?? '' } catch { return '' }
  })
  const [guestEmail, setGuestEmail] = useState<string>(() => {
    try { return localStorage.getItem('support_guest_email') ?? '' } catch { return '' }
  })
  const [started, setStarted] = useState<boolean>(() => isAuthenticated ? true : Boolean(guestName && guestEmail))

  useEffect(() => {
    if (open && scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('support_messages')
      if (raw) setMessages(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    // Persist messages whenever they change
    try { localStorage.setItem('support_messages', JSON.stringify(messages)) } catch {}
  }, [messages])

  // WebSocket connection lifecycle
  useEffect(() => {
    if (!open) return
    if (!isAuthenticated && !started) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/ws/support`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.addEventListener('open', () => setWsConnected(true))
    ws.addEventListener('close', () => setWsConnected(false))
    ws.addEventListener('message', (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload?.type === 'message' && payload?.message) {
          const incoming: Message = { id: payload.id ?? String(Date.now()), sender: payload.sender === 'support' ? 'support' : 'system', text: payload.message, ts: payload.ts ?? new Date().toISOString() }
          setMessages((m) => [...m, incoming])
        }
      } catch (e) { console.error('ws parse', e) }
    })

    return () => {
      try { ws.close() } catch {};
      wsRef.current = null
    }
  }, [open, isAuthenticated, started])

  useEffect(() => {
    try { localStorage.setItem('support_guest_name', guestName) } catch {}
    try { localStorage.setItem('support_guest_email', guestEmail) } catch {}
  }, [guestName, guestEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const senderName = isAuthenticated ? namePrefill : guestName.trim()
    const senderEmail = isAuthenticated ? emailPrefill : guestEmail.trim()
    if (!senderEmail || !senderName || !message.trim()) {
      toast.error('Please provide your name, email and a message')
      return
    }
    setLoading(true)
    const id = String(Date.now())
    const msg: Message = { id, sender: 'customer', text: message.trim(), ts: new Date().toISOString() }
    setMessages((m) => { const next = [...m, msg]; try { localStorage.setItem('support_messages', JSON.stringify(next)) } catch {}; return next })
    setMessage('')

    try {
      // Prefer WebSocket if connected
      if (wsRef.current && wsConnected && wsRef.current.readyState === WebSocket.OPEN) {
        const payload = { type: 'message', message: msg.text, name: senderName, email: senderEmail, subject }
        wsRef.current.send(JSON.stringify(payload))
        toast.success('Message sent (live)')
      } else {
        const res = await fetch('/api/support/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: senderName, email: senderEmail, subject, message: msg.text }),
        })
        if (!res.ok) throw new Error('Network')
        toast.success('Message sent — support will respond via email')
      }
    } catch (err) {
      const errMsg: Message = { id: String(Date.now()) + '_err', sender: 'system', text: 'Failed to send message. It is saved locally; try again later.', ts: new Date().toISOString() }
      setMessages((m) => { const next = [...m, errMsg]; try { localStorage.setItem('support_messages', JSON.stringify(next)) } catch {}; return next })
      toast.error('Unable to send message. Saved locally.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed right-4 bottom-6 z-50">
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
        <div className="fixed z-50 right-4 bottom-20">
          <div className="w-[min(96vw,520px)] max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="font-semibold">Customer Support</div>
                <div className="text-xs text-gray-500">Complaints & feedback — we'll reply by email</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-500 hover:text-gray-900">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 mt-2">
              <div className="text-xs text-gray-500">Connection: {wsConnected ? <span className="text-green-600">Live</span> : <span className="text-gray-500">Offline</span>}</div>
            </div>

            <div ref={scrollerRef} className="p-4 overflow-y-auto flex-1 space-y-3">
              {/* Guest start flow: require name + email before enabling chat */}
              {!isAuthenticated && !started && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">Please provide your name and email to start the chat.</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" className="input-field" />
                    <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Your email" className="input-field" />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const name = guestName.trim()
                        const email = guestEmail.trim()
                        if (!name || !email) {
                          toast.error('Please enter name and email to start')
                          return
                        }
                        // basic email check
                        if (!email.includes('@')) { toast.error('Please enter a valid email'); return }
                        try { localStorage.setItem('support_guest_name', name); localStorage.setItem('support_guest_email', email) } catch {}
                        setStarted(true)
                      }}
                      className="btn-primary px-3 py-1 text-sm"
                    >
                      Start chat
                    </button>
                  </div>
                </div>
              )}
              {messages.length === 0 && (
                <div className="text-sm text-gray-500">No messages yet — start a conversation.</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={m.sender === 'customer' ? 'flex justify-end' : m.sender === 'support' ? 'flex justify-start' : 'flex justify-center'}>
                  <div className={
                    m.sender === 'customer'
                      ? 'bg-brand-teal text-white px-3 py-2 rounded-lg max-w-[80%]'
                      : m.sender === 'support'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg max-w-[80%]'
                        : 'text-xs text-gray-500 italic px-2'
                  }>
                    {m.text}
                    <div className="text-[10px] text-gray-400 mt-1 text-right">{new Date(m.ts).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-1 gap-2">
                {!isAuthenticated && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" className="input-field" />
                    <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Your email" className="input-field" />
                  </div>
                )}
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" className="input-field" />
                <div className="flex items-center gap-2">
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Type your message..." className="input-field flex-1" disabled={!isAuthenticated && !started} />
                  <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm">
                    {loading ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
