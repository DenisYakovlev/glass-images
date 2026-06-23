import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

export function HelpTooltip({ text }) {
  const [position, setPosition] = useState(null)
  if (!text) return null

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPosition({
          top: Math.min(rect.bottom + 8, window.innerHeight - 12),
          left: Math.min(Math.max(12, rect.right - 256), window.innerWidth - 268),
        })
      }}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPosition({
          top: Math.min(rect.bottom + 8, window.innerHeight - 12),
          left: Math.min(Math.max(12, rect.right - 256), window.innerWidth - 268),
        })
      }}
      onBlur={() => setPosition(null)}
      tabIndex={0}
    >
      <HelpCircle className="h-4 w-4 text-zinc-500" aria-hidden="true" />
      {position ? (
        <span
          className="pointer-events-none fixed z-[200] w-64 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-100 shadow-2xl"
          style={{ top: position.top, left: position.left }}
        >
          {text}
        </span>
      ) : null}
    </span>
  )
}

export function Field({ label, children, help, error }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-1.5 text-zinc-300">
        <span className="truncate">{label}</span>
        <HelpTooltip text={help} />
      </span>
      {children}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  )
}

export function Section({ title, icon: Icon, children }) {
  return (
    <section className="border-b border-zinc-800 px-5 py-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-100">
        <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-9 min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 ${props.className || ''}`}
    />
  )
}

export function SelectInput(props) {
  return (
    <select
      {...props}
      className={`h-9 min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 ${props.className || ''}`}
    />
  )
}

export function CheckboxField({ label, checked, onChange, help }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{label}</span>
        <HelpTooltip text={help} />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-violet-400"
      />
    </label>
  )
}

export function Button({ variant = 'default', className = '', children, ...props }) {
  const variants = {
    default:
      'cursor-pointer border border-zinc-700 bg-zinc-950/80 text-zinc-100 backdrop-blur transition hover:border-violet-400',
    primary: 'cursor-pointer bg-violet-400 text-zinc-950 transition hover:bg-violet-300',
    danger: 'cursor-pointer border border-red-400/40 text-red-100 transition hover:bg-red-500/10',
    subtle: 'cursor-pointer border border-zinc-700 text-zinc-100 transition hover:border-zinc-500',
  }

  return (
    <button
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
