'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  useVendorPayoutBalance,
  useVendorPayoutMethods,
  useVendorPayouts,
  useCreateMpesaPayoutMethod,
  useCreateBankTransferPayoutMethod,
  useUpdateBankTransferPayoutMethod,
  useDeletePayoutMethod,
  useRequestVendorWithdrawal,
} from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { unwrapPaginated } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

type PayoutMethod = {
  id: string
  type: string
  accountName: string
  phone?: string
  bankAccountNumber?: string
  bankRoutingNumber?: string
  bankName?: string
  bankCurrency?: string
  isDefault: boolean
}

type Payout = {
  id: string
  amount: number
  currency: string
  status: string
  reference?: string
  createdAt: string
  completedAt?: string
}

export default function VendorWithdrawalsPage() {
  const formatPrice = useFormatCurrency()
  const { data: balanceData, loading: balanceLoading, refetch: refetchBalance } = useVendorPayoutBalance()
  const { data: methodsData, loading: methodsLoading, refetch: refetchMethods } = useVendorPayoutMethods()
  const { data: payoutsData, loading: payoutsLoading, refetch: refetchPayouts } = useVendorPayouts()
  const createMpesaMethod = useCreateMpesaPayoutMethod().mutate
  const createBankMethod = useCreateBankTransferPayoutMethod().mutate
  const updateBankMethod = useUpdateBankTransferPayoutMethod().mutate
  const deleteMethod = useDeletePayoutMethod().mutate
  const requestWithdrawal = useRequestVendorWithdrawal().mutate
  const withdrawKey = useRef('')

  const balance = balanceData as { availableBalance?: number; minimumWithdraw?: number } | null
  const methods = (methodsData as PayoutMethod[] | null) ?? []
  const { items: payouts } = unwrapPaginated<Payout>(payoutsData)

  const [activeTab, setActiveTab] = useState<string>('')

  const [showBankForm, setShowBankForm] = useState(false)
  const [editingBankMethod, setEditingBankMethod] = useState<PayoutMethod | null>(null)
  const [deletingMethod, setDeletingMethod] = useState<string | null>(null)

  const [mpesaAccountName, setMpesaAccountName] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')

  const [bankAccountName, setBankAccountName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankRoutingNumber, setBankRoutingNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankCurrency, setBankCurrency] = useState('KES')

  const available = balance?.availableBalance ?? 0
  const minimum = balance?.minimumWithdraw ?? 100
  const hasDefaultMethod = methods.some((m) => m.isDefault) || methods.length > 0
  const canWithdraw = hasDefaultMethod && available >= minimum

  const defaultMethod = methods.find((m) => m.isDefault)
  const defaultMethodLabel = defaultMethod?.type === 'mpesa'
    ? 'M-Pesa'
    : `Bank Transfer (${defaultMethod?.bankName || 'N/A'})`

  const mpesaMethods = methods.filter((m) => m.type === 'mpesa')
  const bankMethods = methods.filter((m) => m.type === 'bank_transfer')
  const primaryMpesa = mpesaMethods[0]
  const primaryBank = bankMethods[0]

  if (activeTab === '' && primaryMpesa) setActiveTab(primaryMpesa.id)
  else if (activeTab === '' && primaryBank) setActiveTab(primaryBank.id)
  else if (activeTab === '' && methods.length === 0) setActiveTab('add')

  const isAddMode = activeTab === 'add'
  const activeMethod = methods.find((m) => m.id === activeTab)

  async function saveMpesa(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMpesaMethod({ accountName: mpesaAccountName.trim(), phone: mpesaPhone.trim(), isDefault: true })
      await refetchMethods()
      setMpesaAccountName('')
      setMpesaPhone('')
      toast.success('M-Pesa payout method saved')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to save M-Pesa details.'))
    }
  }

  async function saveBankAccount() {
    try {
      if (editingBankMethod) {
        await updateBankMethod({
          methodId: editingBankMethod.id,
          accountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankRoutingNumber: bankRoutingNumber.trim(),
          bankName: bankName.trim(),
          bankCurrency,
          isDefault: true,
        })
        toast.success('Bank account updated')
      } else {
        await createBankMethod({
          accountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankRoutingNumber: bankRoutingNumber.trim(),
          bankName: bankName.trim(),
          bankCurrency,
          isDefault: true,
        })
        toast.success('Bank account saved')
      }
      await refetchMethods()
      setShowBankForm(false)
      setEditingBankMethod(null)
      setBankAccountName('')
      setBankAccountNumber('')
      setBankRoutingNumber('')
      setBankName('')
      setBankCurrency('KES')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to save bank account.'))
    }
  }

  async function removeMethod(methodId: string) {
    setDeletingMethod(methodId)
    try {
      await deleteMethod(methodId)
      await refetchMethods()
      const remaining = methods.filter((m) => m.id !== methodId)
      if (remaining.length > 0 && (activeTab === methodId || !remaining.some((m) => m.id === activeTab))) {
        setActiveTab(remaining[0].id)
      } else if (remaining.length === 0) {
        setActiveTab('add')
      }
      toast.success('Payout method removed')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to remove payout method.'))
    } finally {
      setDeletingMethod(null)
    }
  }

  async function withdraw() {
    if (!canWithdraw) return
    try {
      if (!withdrawKey.current) {
        withdrawKey.current = `withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      }
      await requestWithdrawal({ idempotencyKey: withdrawKey.current })
      withdrawKey.current = ''
      await Promise.all([refetchBalance(), refetchPayouts()])
      toast.success(`Withdrawal sent to ${defaultMethodLabel}`)
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Withdrawal failed. Please try again.'))
    }
  }

function startEditBank(method: PayoutMethod) {
  setEditingBankMethod(method)
  setBankAccountName(method.accountName)
  setBankAccountNumber(method.bankAccountNumber || '')
  setBankRoutingNumber(method.bankRoutingNumber || '')
  setBankName(method.bankName || '')
  setBankCurrency(method.bankCurrency || 'KES')
  setShowBankForm(true)
}

const tabs = [
  ...mpesaMethods.map((m) => ({ id: m.id, label: 'M-Pesa' })),
  ...bankMethods.map((m) => ({ id: m.id, label: m.bankName || 'Bank Account' })),
  { id: 'add', label: '+ Add Payment Method' },
]

const tabPanel = () => {
  if (isAddMode && showBankForm) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">Add Bank Account</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Holder Name</label>
            <input
              className="input-field mt-1 w-full"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="Name on the bank account"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
            <input
              className="input-field mt-1 w-full"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Equity Bank, KCB"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
            <input
              className="input-field mt-1 w-full"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Bank account number"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Routing Number / SWIFT / IFSC</label>
            <input
              className="input-field mt-1 w-full"
              value={bankRoutingNumber}
              onChange={(e) => setBankRoutingNumber(e.target.value)}
              placeholder="Bank code or SWIFT/IFSC"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
            <select
              className="input-field mt-1 w-full"
              value={bankCurrency}
              onChange={(e) => setBankCurrency(e.target.value)}
            >
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm" onClick={saveBankAccount}>Save Bank Account</button>
            <button className="btn-secondary text-sm" onClick={() => { setShowBankForm(false); setEditingBankMethod(null) }}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  if (isAddMode) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Choose a payment method to add, or update the details below.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            className="btn-secondary text-sm"
            onClick={() => {
              setEditingBankMethod(null)
              setShowBankForm(false)
              setActiveTab(primaryMpesa?.id || 'add')
            }}
          >
            {primaryMpesa ? 'Update M-Pesa' : 'Add M-Pesa'}
          </button>
          <button
            className="btn-secondary text-sm"
            onClick={() => {
              setEditingBankMethod(null)
              setBankAccountName('')
              setBankAccountNumber('')
              setBankRoutingNumber('')
              setBankName('')
              setBankCurrency('KES')
              setShowBankForm(true)
              if (primaryBank) setActiveTab(primaryBank.id)
            }}
          >
            {primaryBank ? 'Update Bank Account' : 'Add Bank Account'}
          </button>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">M-Pesa details</h4>
          <form onSubmit={saveMpesa} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account name</label>
              <input
                className="input-field mt-1 w-full"
                value={mpesaAccountName}
                onChange={(e) => setMpesaAccountName(e.target.value)}
                placeholder="Name on M-Pesa account"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">M-Pesa phone number</label>
              <input
                className="input-field mt-1 w-full"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="0712345678"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Safaricom or Airtel number registered on M-Pesa (07… or 01…).</p>
            </div>
            <button type="submit" className="btn-secondary text-sm" disabled={methodsLoading}>
              {methods.length ? 'Update M-Pesa details' : 'Save M-Pesa details'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!activeMethod) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">No payment method details found.</p>
      </div>
    )
  }

  const isMpesa = activeMethod.type === 'mpesa'

  if (!activeMethod.isDefault && !isMpesa && editingBankMethod?.id === activeMethod.id && showBankForm) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">Edit Bank Account</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Holder Name</label>
            <input
              className="input-field mt-1 w-full"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="Name on the bank account"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
            <input
              className="input-field mt-1 w-full"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Equity Bank, KCB"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
            <input
              className="input-field mt-1 w-full"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Bank account number"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Routing Number / SWIFT / IFSC</label>
            <input
              className="input-field mt-1 w-full"
              value={bankRoutingNumber}
              onChange={(e) => setBankRoutingNumber(e.target.value)}
              placeholder="Bank code or SWIFT/IFSC"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
            <select
              className="input-field mt-1 w-full"
              value={bankCurrency}
              onChange={(e) => setBankCurrency(e.target.value)}
            >
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm" onClick={saveBankAccount}>Save changes</button>
            <button className="btn-secondary text-sm" onClick={() => { setShowBankForm(false); setEditingBankMethod(null) }}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="badge badge-featured mb-2">{isMpesa ? 'M-Pesa' : 'Bank Transfer'}</span>
          <h4 className="font-semibold mt-1">{activeMethod.accountName}</h4>
          <p className="text-sm text-gray-500 mt-1">
            {isMpesa ? (activeMethod.phone ? `••••${activeMethod.phone.slice(-4)}` : 'No phone added') : `${activeMethod.bankName || 'Bank'} • ${activeMethod.bankAccountNumber ? '••••' + activeMethod.bankAccountNumber.slice(-4) : 'No account number'} ${activeMethod.bankCurrency ? `(${activeMethod.bankCurrency})` : ''}`}
          </p>
        </div>
        {activeMethod.isDefault && (
          <span className="badge bg-brand-teal/10 text-brand-teal dark:bg-brand-orange/10 dark:text-brand-orange">Default</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!activeMethod.isDefault && (
          <button
            className="btn-secondary text-sm"
            onClick={async () => {
              await refetchMethods()
            }}
          >
            Set as default
          </button>
        )}
        <button
          className="text-sm text-red-500 hover:text-red-600 dark:text-red-400"
          onClick={() => removeMethod(activeMethod.id)}
          disabled={deletingMethod === activeMethod.id}
        >
          {deletingMethod === activeMethod.id ? 'Removing…' : 'Remove'}
        </button>
        {!isMpesa && (
          <button
            className="btn-ghost text-sm"
            onClick={() => startEditBank(activeMethod)}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

  return (
    <div className="space-y-6">
      <div>
        <p className="micro-label mb-1">Earnings</p>
        <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Withdraw Funds</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Withdraw earnings from delivered orders. Minimum payout is {formatPrice(minimum)}.</p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Available balance</p>
            {balanceLoading ? (
              <p className="text-gray-400 dark:text-gray-300">Loading…</p>
            ) : (
              <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{formatPrice(available)}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Default method: <span className="font-medium text-brand-teal dark:text-brand-orange">{hasDefaultMethod ? defaultMethodLabel : 'None set'}</span>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Amount to withdraw</label>
              <input
                type="number"
                min={minimum}
                max={Math.max(available, 0)}
                step="0.01"
                className="input-field w-full sm:w-40 text-right"
                placeholder={`${formatPrice(minimum)} min`}
              />
            </div>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={!canWithdraw}
              onClick={withdraw}
            >
              Withdraw to {defaultMethod?.type === 'bank_transfer' ? (defaultMethod.bankName || 'Bank') : defaultMethod?.type === 'mpesa' ? 'M-Pesa' : 'default method'}
            </button>
          </div>
        </div>

        {!hasDefaultMethod && !methodsLoading && (
          <p className="text-sm text-amber-600 dark:text-amber-500">Add a payout method below before withdrawing.</p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
          <button
            className="btn-secondary text-sm"
            onClick={() => setActiveTab('add')}
          >
            + Add Payment Method
          </button>
        </div>

        {methods.length === 0 && !methodsLoading && !isAddMode && (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No payout methods configured.</p>
            <button className="btn-primary text-sm" onClick={() => setActiveTab('add')}>Add your first payment method</button>
          </div>
        )}

        {tabs.length > 1 && (
          <div className="border-b border-gray-200 dark:border-gray-800 -mx-6 px-6">
            <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Payment methods">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      if (tab.id === 'add') {
                        setShowBankForm(false)
                        setEditingBankMethod(null)
                      }
                    }}
                    className={`whitespace-nowrap py-3 text-sm font-medium transition-colors duration-200 border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal dark:focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
                      isActive
                        ? 'border-brand-teal text-brand-teal dark:border-brand-orange dark:text-brand-orange'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.id !== 'add' && methods.find((m) => m.id === tab.id)?.isDefault && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal/10 px-2 py-0.5 text-[10px] font-medium text-brand-teal dark:bg-brand-orange/10 dark:text-brand-orange">Default</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        <div className="mt-4 transition-all duration-200 ease-in-out">
          {tabPanel()}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Withdrawal history</h3>
        {payoutsLoading ? (
          <p className="text-gray-400 dark:text-gray-300">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No withdrawals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4 text-gray-900 dark:text-white">Date</th>
                  <th className="py-2 pr-4 text-gray-900 dark:text-white">Amount</th>
                  <th className="py-2 pr-4 text-gray-900 dark:text-white">Status</th>
                  <th className="py-2 text-gray-900 dark:text-white">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">{formatPrice(payout.amount)}</td>
                    <td className="py-3 pr-4 capitalize text-gray-900 dark:text-white">{payout.status}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{payout.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}