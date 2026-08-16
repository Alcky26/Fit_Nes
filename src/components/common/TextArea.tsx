import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextArea({ label, hint, id, ...rest }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <textarea id={inputId} rows={3} {...rest} />
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
