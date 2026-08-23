import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useAppData } from '../hooks/useAppData'
import { ItemCombobox } from './ItemCombobox'
import { InfoTooltip } from './InfoTooltip'
import { btnPrimary, inputCls } from './ui'

export function AddStockModal({
  onOpenSettings,
  onClose,
}: {
  onOpenSettings: () => void
  onClose: () => void
}) {
  const { allowedItems, run } = useAppData()
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cost, setCost] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const options = useMemo(
    () => [...allowedItems].sort((a, b) => a.name.localeCompare(b.name)),
    [allowedItems],
  )

  const selectedUnit = (id: string) =>
    allowedItems.find((i) => i.id === id)?.unit ?? ''

  const add = async () => {
    const item = allowedItems.find((i) => i.id === itemId)
    const q = Number(quantity)
    if (!item || !(q > 0)) {
      setMessage('Choose an item and enter a quantity above 0.')
      return
    }
    const ok = await run(() =>
      api.addGroceries([
        {
          name: item.name,
          quantity: q,
          unit: item.unit,
          expiry_date: expiry || null,
          cost: cost.trim() === '' ? null : Number(cost),
        },
      ]),
    )
    if (ok) {
      setItemId('')
      setQuantity('')
      setExpiry('')
      setCost('')
      setMessage(`Added ${item.name} to your inventory.`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add to inventory
              <InfoTooltip text="Pick items from your configured list — their unit is applied automatically." />
            </h3>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        {options.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            No allowed items yet. Configure the list of items you want to buy
            in{' '}
            <button
              onClick={onOpenSettings}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Settings
            </button>
            .
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Item name</span>
                <ItemCombobox
                  options={options}
                  value={itemId}
                  onChange={(id) => setItemId(id)}
                />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quantity</span>
                  <input
                    className={`${inputCls} w-full`}
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unit</span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {itemId ? selectedUnit(itemId) : '—'}
                  </span>
                </div>
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
            </div>

            <div className="mt-4 flex justify-end">
              <button className={btnPrimary} onClick={() => void add()}>
                Add
              </button>
            </div>
            {message && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
