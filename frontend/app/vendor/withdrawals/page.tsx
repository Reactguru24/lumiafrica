'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  useVendorPayoutBalance,
  useVendorPayoutMethods,
  useVendorPayouts,
  useCreateMpesaPayoutMethod,
  useRequestVendorWithdrawal,
} from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { unwrapPaginated } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

type PayoutMethod = {
  id: string
  accountName: string
  phone: string
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
  const createMethod = useCreateMpesaPayoutMethod().mutate
  const requestWithdrawal = useRequestVendorWithdrawal().mutate
  const withdrawKey = useRef('')

  const balance = balanceData as { availableBalance?: number; minimumWithdraw?: number } | null
  const methods = (methodsData as PayoutMethod[] | null) ?? []
  const { items: payouts } = unwrapPaginated<Payout>(payoutsData)

  const [accountName, setAccountName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingMethod, setSavingMethod] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  const available = balance?.availableBalance ?? 0
  const minimum = balance?.minimumWithdraw ?? 100
  const hasMpesa = methods.some((m) => m.isDefault) || methods.length > 0
  const canWithdraw = hasMpesa && available >= minimum

  async function saveMpesa(e: React.FormEvent) {
    e.preventDefault()
    setSavingMethod(true)
    try {
      await createMethod({ accountName: accountName.trim(), phone: phone.trim(), isDefault: true })
      await refetchMethods()
      setAccountName('')
      setPhone('')
      toast.success('M-Pesa payout method saved')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to save M-Pesa details.'))
    } finally {
      setSavingMethod(false)
    }
  }

  async function withdraw() {
    if (!canWithdraw) return
    setWithdrawing(true)
    try {
      if (!withdrawKey.current) {
        withdrawKey.current = `withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      }
      await requestWithdrawal({ idempotencyKey: withdrawKey.current })
      withdrawKey.current = ''
      await Promise.all([refetchBalance(), refetchPayouts()])
      toast.success('Withdrawal sent to M-Pesa')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Withdrawal failed. Please try again.'))
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="micro-label mb-1">Earnings</p>
        <h2 className="font-semibold text-lg">Withdraw to M-Pesa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Withdraw earnings from delivered orders. Minimum payout is {formatPrice(minimum)}.
        </p>
      </div>

      <div className="card p-6">
        <p className="text-sm text-gray-500 mb-1">Available balance</p>
        {balanceLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <p className="text-3xl font-semibold">{formatPrice(available)}</p>
        )}
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={!canWithdraw || withdrawing}
          onClick={withdraw}
        >
          {withdrawing ? 'Processing…' : 'Withdraw full balance to M-Pesa'}
        </button>
        {!hasMpesa && !methodsLoading && (
          <p className="text-sm text-amber-600 mt-3">Add your M-Pesa number below before withdrawing.</p>
        )}
      </div>

      <form className="card p-6 space-y-4 max-w-lg" onSubmit={saveMpesa}>
        <h3 className="font-semibold">M-Pesa payout details</h3>
        <div>
          <label className="text-sm font-medium">Account name</label>
          <input
            className="input mt-1 w-full"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on M-Pesa account"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">M-Pesa phone number</label>
          <input
            className="input mt-1 w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Safaricom or Airtel number registered on M-Pesa (07… or 01…).</p>
        </div>
        {methods.length > 0 && (
          <div className="text-sm text-gray-500 space-y-1">
            {methods.map((method) => (
              <p key={method.id}>
                {method.accountName} · {method.phone}
                {method.isDefault ? ' (default)' : ''}
              </p>
            ))}
          </div>
        )}
        <button type="submit" className="btn-secondary" disabled={savingMethod}>
          {savingMethod ? 'Saving…' : methods.length ? 'Update M-Pesa details' : 'Save M-Pesa details'}
        </button>
      </form>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Withdrawal history</h3>
        {payoutsLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-gray-500">No withdrawals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-3 pr-4">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{formatPrice(payout.amount)}</td>
                    <td className="py-3 pr-4 capitalize">{payout.status}</td>
                    <td className="py-3 text-gray-500">{payout.reference || '—'}</td>
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
