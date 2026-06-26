import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-24 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          The page you requested could not be found. It may have moved or no longer exists.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
          >
            Back home
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Browse products
          </Link>
        </div>
      </div>
    </main>
  )
}
