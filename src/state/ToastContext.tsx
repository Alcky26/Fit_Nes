import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UNDO_WINDOW_MS } from '../utils/constants'

interface UndoToastState {
  message: string
  onUndo: () => void | Promise<void>
}

type ShowUndoToast = (message: string, onUndo: () => void | Promise<void>) => void

const ToastContext = createContext<ShowUndoToast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<UndoToastState | null>(null)
  const timerRef = useRef<number | null>(null)

  const showUndoToast = useCallback<ShowUndoToast>((message, onUndo) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setToast({ message, onUndo })
    timerRef.current = window.setTimeout(() => setToast(null), UNDO_WINDOW_MS)
  }, [])

  async function handleUndo() {
    if (!toast) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    const { onUndo } = toast
    setToast(null)
    await onUndo()
  }

  return (
    <ToastContext.Provider value={showUndoToast}>
      {children}
      {toast && (
        <div className="undo-toast" role="status">
          <span>{toast.message}</span>
          <button type="button" className="undo-toast__action" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useUndoToast(): ShowUndoToast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useUndoToast must be used within a ToastProvider')
  return ctx
}
