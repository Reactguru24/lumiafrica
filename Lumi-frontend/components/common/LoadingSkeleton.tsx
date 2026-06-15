interface LoadingSkeletonProps {
  count?: number
  height?: string
}

export function LoadingSkeleton({ count = 4, height = '280px' }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  )
}
