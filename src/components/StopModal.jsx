import { X } from 'lucide-react'
import { Button } from './FormControls'

export function StopModal({ open, onClose, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-zinc-100">Stop generation?</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-6 text-zinc-400">
          Current progress will be discarded and no schematic will be downloaded.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="subtle" onClick={onClose}>
            Keep running
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} className="bg-red-400 hover:bg-red-300">
            Stop
          </Button>
        </div>
      </div>
    </div>
  )
}
