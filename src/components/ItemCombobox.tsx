import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { AllowedItem } from '../lib/types'
import {
  comboOption,
  comboOptionActive,
  comboPanel,
  inputCls,
} from './ui'

interface ItemComboboxProps {
  options: AllowedItem[]
  value: string
  onChange: (itemId: string) => void
  placeholder?: string
}

export function ItemCombobox({ options, value, onChange, placeholder }: ItemComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const selected = useMemo(
    () => options.find((item) => item.id === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q === '' ? options : options.filter((item) => item.name.toLowerCase().includes(q))
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [options, query])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selectItem = (itemId: string) => {
    onChange(itemId)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[highlight]
        if (item) selectItem(item.id)
        return
      }
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        className={inputCls}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[highlight] ? `combo-opt-${filtered[highlight].id}` : undefined
        }
        value={selected && !open ? `${selected.name} — ${selected.unit}` : query}
        placeholder={placeholder ?? 'Choose an item…'}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (selected && e.target.value !== `${selected.name} — ${selected.unit}`) {
            onChange('')
          }
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center text-slate-400"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul id={listboxId} role="listbox" className={comboPanel}>
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
              No matching item
            </li>
          )}
          {filtered.map((item, i) => (
            <li
              key={item.id}
              id={`combo-opt-${item.id}`}
              role="option"
              aria-selected={item.id === value}
              className={i === highlight ? comboOptionActive : comboOption}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(item.id)}
            >
              {item.name}
              <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{item.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}