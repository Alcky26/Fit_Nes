import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      onCancel={(event) => {
        // Fires on Escape — treat it the same as tapping Cancel. (We don't
        // also listen for the native 'close' event, since calling
        // dialog.close() ourselves after onConfirm would double-fire it.)
        event.preventDefault()
        onCancel()
      }}
    >
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <div className="confirm-dialog__actions">
        <button type="button" className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn btn--primary${destructive ? ' btn--danger' : ''}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
