import PromotionProductsClient from './PromotionProductsClient'

type Props = {
  params: { id: string }
}

export default function PromotionProductsPage({ params }: Props) {
  return <PromotionProductsClient promotionId={params.id} />
}

