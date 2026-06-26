import PromotionProductsClient from './PromotionProductsClient'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PromotionProductsPage({ params }: Props) {
  const { id } = await params
  return <PromotionProductsClient promotionId={id} />
}

