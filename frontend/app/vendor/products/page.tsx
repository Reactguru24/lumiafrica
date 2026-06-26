'use client'

import { useState } from 'react'
import { MediaImage } from '@/components/common/MediaImage'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVendorProducts, useCreateVendorProduct, useUpdateVendorProduct, useDeleteVendorProduct, useUpdateVendorProductFeatured, useVendorSubscription, useSubscriptionPlans, useProductFilters } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { unwrapItems } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { productSchema } from '@/lib/utils/validation'
import { normalizeProductColor, parseProductColors, type ProductColorOption } from '@/lib/constants/productColors'
import { buildVariantMatrix, totalVariantStock, type ProductVariant } from '@/lib/utils/productVariants'
import { ColorPalettePicker } from '@/components/vendor/ColorPalettePicker'
import { VariantStockMatrix } from '@/components/vendor/VariantStockMatrix'
import { ProductImagesUpload } from '@/components/vendor/ProductImagesUpload'
import { Modal } from '@/components/common/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { categoryLabel, subcategoryLabel } from '@/lib/utils/productFilters'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { Product, Gender } from '@/lib/types'
import type { ProductFilterOptions } from '@/lib/types/filters'

const GENDERS: Gender[] = ['men', 'women', 'kids', 'unisex']
const DEFAULT_SIZES = ['S', 'M', 'L']
const MAX_PRODUCT_IMAGES = 5

type ProductForm = {
  name: string
  description: string
  sku: string
  category: string
  subcategory: string
  brand: string
  gender: Gender
  sizesInput: string
  colors: ProductColorOption[]
  variantStock: ProductVariant[]
  price: number
  discount: number
  images: string[]
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  sku: '',
  category: '',
  subcategory: '',
  brand: '',
  gender: 'men',
  sizesInput: DEFAULT_SIZES.join(', '),
  colors: [],
  variantStock: [],
  price: 0,
  discount: 0,
  images: [],
})

function parseListInput(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

function buildPayload(form: ProductForm) {
  const sizes = parseListInput(form.sizesInput)
  const variantStock = buildVariantMatrix(sizes, form.colors, form.variantStock)
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    brand: form.brand.trim(),
    category: form.category.trim(),
    subcategory: form.subcategory.trim(),
    gender: form.gender,
    price: Number(form.price),
    discount: Number(form.discount) || 0,
    stock: totalVariantStock(variantStock),
    sku: form.sku.trim(),
    sizes,
    colors: form.colors,
    variantStock,
    images: form.images,
  }
}

export default function VendorProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingImages, setUploadingImages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: productsAPI, loading: productsLoading, refetch: refetchProducts } = useVendorProducts()
  const { data: filterOptionsData } = useProductFilters()
  const { data: activeSubscription } = useVendorSubscription()
  const { data: plansData } = useSubscriptionPlans()
  const { mutate: updateProductFeatured, loading: featuredLoading } = useUpdateVendorProductFeatured()
  const { mutate: createProduct, loading: createLoading } = useCreateVendorProduct()
  const { mutate: updateProduct, loading: updateLoading } = useUpdateVendorProduct()
  const { mutate: deleteProduct, loading: deleteLoading } = useDeleteVendorProduct()

  const filterOptions = (filterOptionsData as ProductFilterOptions | null) ?? null
  const categories = filterOptions?.categories ?? []
  const availableSubcategories = form.category
    ? (filterOptions?.subcategoriesByCategory?.[form.category] ?? [])
    : []
  const products = unwrapItems<Product>(productsAPI)
  const sizes = parseListInput(form.sizesInput)

  function updateForm(patch: Partial<ProductForm>) {
    setForm((current) => {
      const next = { ...current, ...patch }
      if (patch.variantStock !== undefined) {
        return next
      }
      if (patch.sizesInput === undefined && patch.colors === undefined) {
        return next
      }
      const nextSizes = parseListInput(next.sizesInput)
      return {
        ...next,
        variantStock: buildVariantMatrix(nextSizes, next.colors, current.variantStock),
      }
    })
  }

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return [
      product.name,
      product.sku,
      product.brand,
      product.category,
      product.subcategory,
      product.status,
    ].some((value) => value.toLowerCase().includes(query))
  })
  const { page, totalPages, paginated, total, goTo, reset, pageSize } = usePagination(filteredProducts, 10)

  const tableData = paginated.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images?.[0],
    sku: p.sku,
    price: p.price,
    stock: p.stock,
    status: p.status,
    featured: p.featured,
  }))

  const featuredCount = products.filter((p) => p.featured).length
  const hasActiveSub = !!(activeSubscription as { active?: boolean; expiresAt?: string })?.active
    && new Date((activeSubscription as { expiresAt?: string })?.expiresAt || 0) > new Date()
  const plansMap = (plansData as Record<string, { featuredSlots?: number }>) || {}
  const activePlanId = (activeSubscription as { plan?: string })?.plan
  const featuredSlotLimit = hasActiveSub && activePlanId
    ? (plansMap[activePlanId]?.featuredSlots ?? 3)
    : 0

  async function setProductFeatured(id: string, featured: boolean) {
    if (featured && featuredCount >= featuredSlotLimit) {
      toast.error(`You can feature up to ${featuredSlotLimit} products. Uncheck one first, then select another.`)
      return
    }
    try {
      await updateProductFeatured({ id, featured })
      toast.success(featured ? 'Product featured' : 'Product removed from featured section')
      await refetchProducts()
    } catch (e: unknown) {
      await refetchProducts()
      toast.error(getFriendlyErrorMessage(e, 'Unable to update featured product. An active subscription may be required.'))
    }
  }

  async function saveProduct() {
    setErrors({})
    const payload = buildPayload(form)
    const result = productSchema.safeParse({
      ...payload,
      sizes: payload.sizes,
    })
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    if (!payload.category) {
      setErrors({ category: 'Category is required' })
      return
    }
    if (!payload.subcategory) {
      setErrors({ subcategory: 'Subcategory is required' })
      return
    }
    const allowedSubcategories = filterOptions?.subcategoriesByCategory?.[payload.category] ?? []
    if (!allowedSubcategories.includes(payload.subcategory)) {
      setErrors({ subcategory: 'Select a valid subcategory for this category' })
      return
    }
    if (!payload.images.length) {
      setErrors({ images: 'At least one product image is required' })
      return
    }
    if (!payload.colors.length) {
      setErrors({ colors: 'Select at least one color' })
      return
    }
    if (!payload.sizes.length) {
      setErrors({ sizes: 'At least one size is required' })
      return
    }
    if (payload.variantStock.length === 0) {
      setErrors({ variantStock: 'Set stock for at least one size and color combination' })
      return
    }

    try {
      if (editingId) {
        await updateProduct({ id: editingId, payload })
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload)
        toast.success('Product published')
      }
      refetchProducts()
      resetForm()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to save product. Please check your details.'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this product? It will be removed from your active listings.')) return
    try {
      await deleteProduct(id)
      toast.success('Product archived')
      refetchProducts()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to archive product.'))
    }
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
    setErrors({})
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm())
    setErrors({})
    setShowForm(true)
  }

  function editProduct(product: Product) {
    const colors = parseProductColors(product.colors as unknown[])
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      gender: product.gender,
      sizesInput: product.sizes.join(', '),
      colors,
      variantStock: buildVariantMatrix(product.sizes, colors, product.variantStock || []),
      price: product.price,
      discount: product.discount,
      images: product.images,
    })
    setErrors({})
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-sm text-gray-500">
            {hasActiveSub
              ? `Featured products appear on the homepage and your store slider (${featuredCount}/${featuredSlotLimit} slots). Uncheck a product to free a slot.`
              : 'Subscribe to feature products on the homepage and store slider.'}
            {!hasActiveSub && (
              <> <Link href="/vendor/subscription" className="underline text-brand-teal dark:text-brand-orange">Get featured</Link></>
            )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); reset() }}
            placeholder="Search products, SKU, brand..."
            className="input-field w-full sm:w-64"
          />
          <button className="btn-primary text-sm py-2 flex items-center justify-center gap-2 w-full sm:w-auto" onClick={openCreateForm}>
            <PlusIcon className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <Modal
        open={showForm}
        title={editingId ? 'Edit Product' : 'Add Product'}
        onClose={resetForm}
        size="xl"
        footer={(
          <>
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button className="btn-primary" onClick={saveProduct} disabled={createLoading || updateLoading || uploadingImages}>
              {createLoading || updateLoading ? 'Saving...' : 'Save Product'}
            </button>
          </>
        )}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} className="input-field mt-1" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">SKU</label>
            <input value={form.sku} onChange={(e) => updateForm({ sku: e.target.value })} className="input-field mt-1" disabled={!!editingId} />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Brand</label>
            <input value={form.brand} onChange={(e) => updateForm({ brand: e.target.value })} className="input-field mt-1" />
            {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={form.category} onChange={(e) => updateForm({ category: e.target.value, subcategory: '' })} className="input-field mt-1">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Subcategory</label>
            <select
              value={form.subcategory}
              onChange={(e) => updateForm({ subcategory: e.target.value })}
              disabled={!form.category}
              className="input-field mt-1"
            >
              <option value="">Select subcategory</option>
              {availableSubcategories.map((s) => <option key={s} value={s}>{subcategoryLabel(s)}</option>)}
            </select>
            {errors.subcategory && <p className="text-red-500 text-xs mt-1">{errors.subcategory}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Gender</label>
            <select value={form.gender} onChange={(e) => updateForm({ gender: e.target.value as Gender })} className="input-field mt-1">
              {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Sizes (comma-separated)</label>
            <input value={form.sizesInput} onChange={(e) => updateForm({ sizesInput: e.target.value })} className="input-field mt-1" placeholder="S, M, L, XL" />
            {errors.sizes && <p className="text-red-500 text-xs mt-1">{errors.sizes}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Price (KES)</label>
            <input value={form.price || ''} onChange={(e) => updateForm({ price: Number(e.target.value) })} type="number" min={0} className="input-field mt-1" />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Discount %</label>
            <input value={form.discount || ''} onChange={(e) => updateForm({ discount: Number(e.target.value) })} type="number" min={0} max={100} className="input-field mt-1" />
          </div>
          <div className="md:col-span-2">
            <ColorPalettePicker
              value={form.colors}
              onChange={(colors) => updateForm({ colors })}
              error={errors.colors}
            />
          </div>
          <div className="md:col-span-2">
            <VariantStockMatrix
              sizes={sizes}
              colors={form.colors}
              variants={form.variantStock}
              onChange={(variantStock) => updateForm({ variantStock })}
              error={errors.variantStock}
            />
            <p className="text-xs text-gray-500 mt-2">
              Total stock: {totalVariantStock(form.variantStock)} units
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={3} className="input-field mt-1" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div className="md:col-span-2">
            <ProductImagesUpload
              images={form.images}
              onChange={(images) => updateForm({ images })}
              maxImages={MAX_PRODUCT_IMAGES}
              error={errors.images}
              onUploadingChange={setUploadingImages}
            />
          </div>
        </div>
      </Modal>

      {productsLoading ? (
        <div className="text-center py-8 text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products yet. Add your first product to get started.</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products match your search.</p>
      ) : (
        <>
          <ResponsiveDataTable
            columns={[
              { key: 'name', label: 'Product', width: '30%' },
              { key: 'sku', label: 'SKU', width: '15%' },
              { key: 'price', label: 'Price', width: '15%', format: (v) => formatCurrency(v as number) },
              { key: 'stock', label: 'Stock', width: '10%' },
              { key: 'featured', label: 'Featured', width: '12%' },
              { key: 'status', label: 'Status', width: '15%' },
            ]}
            rows={tableData}
            renderCell={(key, row) => {
              if (key === 'name') {
                return (
                  <div className="flex items-center gap-3">
                    <MediaImage src={row.image as string} alt={row.name as string} width={40} height={48} transform={{ width: 80, aspect: '3:4' }} className="w-10 h-12 object-cover rounded" />
                    <span className="font-medium">{row.name as string}</span>
                  </div>
                )
              }
              if (key === 'featured') {
                const canFeature = row.status === 'active' || row.status === 'pending'
                const isFeatured = Boolean(row.featured)
                const atLimit = hasActiveSub && featuredCount >= featuredSlotLimit && !isFeatured
                return (
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    disabled={!canFeature || featuredLoading || (!hasActiveSub && !isFeatured) || atLimit}
                    onChange={(e) => setProductFeatured(row.id as string, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange disabled:opacity-40"
                    aria-label={`Feature ${row.name}`}
                    title={
                      !hasActiveSub && !isFeatured
                        ? 'Active subscription required'
                        : atLimit
                          ? `Maximum ${featuredSlotLimit} featured products — uncheck one first`
                          : 'Toggle featured product'
                    }
                  />
                )
              }
              if (key === 'status') return <StatusBadge status={row.status as string} />
              return undefined
            }}
            renderActions={(row) => (
              <>
                <button className="p-1 hover:text-blue-600" onClick={() => editProduct(products.find((p) => p.id === row.id)!)}><PencilIcon className="w-4 h-4" /></button>
                <button className="p-1 hover:text-red-600" disabled={deleteLoading} onClick={() => handleDelete(row.id)} title="Archive"><TrashIcon className="w-4 h-4" /></button>
              </>
            )}
          />
          {total > pageSize && <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} />}
        </>
      )}
    </div>
  )
}
