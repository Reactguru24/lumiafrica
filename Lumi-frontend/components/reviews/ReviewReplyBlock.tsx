'use client'

type ReviewReplyBlockProps = {
  reply: string
  label?: string
}

export function ReviewReplyBlock({ reply, label = 'Store reply' }: ReviewReplyBlockProps) {
  return (
    <div className="mt-3 ml-0 sm:ml-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-brand-orange/40">
      <div className="bg-gray-50 dark:bg-gray-800/80 rounded-md p-3">
        <p className="text-xs font-semibold text-brand-orange mb-1">{label}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{reply}</p>
      </div>
    </div>
  )
}
