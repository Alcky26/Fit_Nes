import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, id, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} {...rest} />
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
