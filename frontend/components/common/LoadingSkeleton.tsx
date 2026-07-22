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

export function ProductCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-card-skeleton">
          <div className="product-card-skeleton-image mb-3" />
          <div className="space-y-2">
            <div className="product-card-skeleton-brand" />
            <div className="product-card-skeleton-title" />
            <div className="product-card-skeleton-price" />
          </div>
        </div>
      ))}
    </div>
  )
}
