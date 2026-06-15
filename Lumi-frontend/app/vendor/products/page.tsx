'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVendorProducts, useCreateVendorProduct, useUpdateVendorProduct, useDeleteVendorProduct, useProductFilters, useUploadImage } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { unwrapItems, resolveMediaUrl } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { productSchema } from '@/lib/utils/validation'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
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
  colorsInput: string
  price: number
  discount: number
  stock: number
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
  colorsInput: '',
  price: 0,
  discount: 0,
  stock: 0,
  images: [],
})

function parseListInput(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

function buildPayload(form: ProductForm) {
  const sizes = parseListInput(form.sizesInput)
  const colorNames = parseListInput(form.colorsInput)
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    brand: form.brand.trim(),
    category: form.category.trim(),
    subcategory: form.subcategory.trim(),
    gender: form.gender,
    price: Number(form.price),
    discount: Number(form.discount) || 0,
    stock: Number(form.stock),
    sku: form.sku.trim(),
    sizes,
    colors: colorNames.map((name) => ({ name, code: '#000000' })),
    images: form.images,
  }
}

export default function VendorProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingImages, setUploadingImages] = useState(false)

  const { data: productsAPI, loading: productsLoading, refetch: refetchProducts } = useVendorProducts()
  const { data: filterOptionsData } = useProductFilters()
  const { mutate: createProduct, loading: createLoading } = useCreateVendorProduct()
  const { mutate: updateProduct, loading: updateLoading } = useUpdateVendorProduct()
  const { mutate: deleteProduct, loading: deleteLoading } = useDeleteVendorProduct()
  const uploadImage = useUploadImage().mutate

  const filterOptions = filterOptionsData as ProductFilterOptions | null
  const categories = filterOptions?.categories?.length ? filterOptions.categories : ['men', 'women', 'kids', 'accessories', 'footwear']
  const products = unwrapItems<Product>(productsAPI)
  const { page, totalPages, paginated, total, goTo, pageSize } = usePagination(products, 10)

  const tableData = paginated.map((p) => ({
    id: p.id,
    name: p.name,
    image: resolveMediaUrl(p.images?.[0]),
    sku: p.sku,
    price: p.price,
    stock: p.stock,
    status: p.status,
  }))

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(false)
    setErrors({})
  }

  function editProduct(p: Product) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description,
      sku: p.sku,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      gender: p.gender,
      sizesInput: (p.sizes || []).join(', '),
      colorsInput: (p.colors || []).map((c) => c.name).join(', '),
      price: p.price,
      discount: p.discount,
      stock: p.stock,
      images: p.images || [],
    })
    setShowForm(true)
    setErrors({})
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    if (form.images.length + files.length > MAX_PRODUCT_IMAGES) {
      toast.error(`You can upload up to ${MAX_PRODUCT_IMAGES} images per product.`)
      return
    }
    setUploadingImages(true)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file.`)
          continue
        }
        const res = await uploadImage(file) as { url?: string }
        const url = res?.url
        if (url) uploaded.push(url)
      }
      if (uploaded.length) {
        setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }))
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`)
      }
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload image.'))
    } finally {
      setUploadingImages(false)
    }
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
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
    if (!payload.images.length) {
      setErrors({ images: 'At least one product image is required' })
      return
    }

    try {
      if (editingId) {
        await updateProduct({ id: editingId, payload })
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload)
        toast.success('Product submitted for review')
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Products</h1>
        <button className="btn-primary text-sm py-2 flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()) }}>
          <PlusIcon className="w-4 h-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 animate-slide-up">
          <h2 className="font-semibold mb-4">{editingId ? 'Edit' : 'Create'} Product</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field mt-1" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field mt-1" disabled={!!editingId} />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Brand</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field mt-1" />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field mt-1">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Subcategory</label>
              <input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="input-field mt-1" placeholder="e.g. T-Shirts" />
              {errors.subcategory && <p className="text-red-500 text-xs mt-1">{errors.subcategory}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })} className="input-field mt-1">
                {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Sizes (comma-separated)</label>
              <input value={form.sizesInput} onChange={(e) => setForm({ ...form, sizesInput: e.target.value })} className="input-field mt-1" placeholder="S, M, L, XL" />
              {errors.sizes && <p className="text-red-500 text-xs mt-1">{errors.sizes}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Colors (comma-separated)</label>
              <input value={form.colorsInput} onChange={(e) => setForm({ ...form, colorsInput: e.target.value })} className="input-field mt-1" placeholder="Black, White, Navy" />
            </div>
            <div>
              <label className="text-sm font-medium">Price (KES)</label>
              <input value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} type="number" min={0} className="input-field mt-1" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Discount %</label>
              <input value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} type="number" min={0} max={100} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Stock</label>
              <input value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} type="number" min={0} className="input-field mt-1" />
              {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-field mt-1" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Product Images</label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">Upload up to {MAX_PRODUCT_IMAGES} images (PNG, JPEG, WebP).</p>
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="relative w-20 h-24 rounded overflow-hidden border border-gray-200 dark:border-gray-700">
                    <Image src={resolveMediaUrl(img)} alt={`Product ${i + 1}`} fill className="object-cover" unoptimized={img.startsWith('/uploads')} />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80" aria-label="Remove image">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {form.images.length < MAX_PRODUCT_IMAGES && (
                  <label className="w-20 h-24 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-brand-orange transition-colors">
                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-500">{uploadingImages ? 'Uploading...' : 'Add'}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                  </label>
                )}
              </div>
              {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={saveProduct} disabled={createLoading || updateLoading || uploadingImages}>
              {createLoading || updateLoading ? 'Saving...' : 'Save'}
            </button>
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {productsLoading ? (
        <div className="text-center py-8 text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products yet. Add your first product to get started.</p>
      ) : (
        <>
          <ResponsiveDataTable
            columns={[
              { key: 'name', label: 'Product', width: '30%' },
              { key: 'sku', label: 'SKU', width: '15%' },
              { key: 'price', label: 'Price', width: '15%', format: (v) => formatCurrency(v as number) },
              { key: 'stock', label: 'Stock', width: '15%' },
              { key: 'status', label: 'Status', width: '15%' },
            ]}
            rows={tableData}
            renderCell={(key, row) => {
              if (key === 'name') {
                return (
                  <div className="flex items-center gap-3">
                    <Image src={row.image as string} alt={row.name as string} width={40} height={48} className="w-10 h-12 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
                    <span className="font-medium">{row.name as string}</span>
                  </div>
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
