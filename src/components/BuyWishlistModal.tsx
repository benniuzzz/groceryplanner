import { useState } from 'react'
import type { AllowedItem } from '../lib/types'
import { fmtQty } from '../lib/utils'
import { btnPrimary, btnSecondary, inputCls } from './ui'

export function BuyWishlistModal({
  item,
  total,
  unit,
  onClose,
  onConfirm,
}: {
  item: AllowedItem
  total: number
  unit: string
  onClose: () => void
  onConfirm: (fields: {
    bought: string
    expiry: string
    cost: string
  }) => Promise<string | null>
}) {
  const [bought, setBought] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    const err = await onConfirm({ bought, expiry, cost })
    if (err) setError(err)
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Bought {item.name}?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {fmtQty(total)} {unit} on your meals&apos; to-buy lists — buying
              adds it to inventory.
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Bought <span className="font-normal text-slate-400 dark:text-slate-500">(of {fmtQty(total)})</span>
            </span>
            <input
              className={`${inputCls} w-full`}
              type="number"
              min="0"
              step="any"
              placeholder={String(total)}
              value={bought}
              onChange={(e) => setBought(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Expiry date <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </span>
            <input
              className={`${inputCls} w-full`}
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Cost <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </span>
            <input
              className={`${inputCls} w-full`}
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} onClick={() => void confirm()}>
            Mark as bought
          </button>
        </div>
      </div>
    </div>
  )
}
