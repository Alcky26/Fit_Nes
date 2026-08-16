import { useEffect, useState } from 'react'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import { processImageFile } from '../../utils/image'

export type PhotoState =
  | { kind: 'none' }
  | { kind: 'existing'; photoId: string }
  | { kind: 'pending'; blob: Blob; mimeType: string; width: number; height: number }

interface PhotoFieldProps {
  value: PhotoState
  onChange: (next: PhotoState) => void
}

export function PhotoField({ value, onChange }: PhotoFieldProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const existingUrl = usePhotoUrl(value.kind === 'existing' ? value.photoId : null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  useEffect(() => {
    if (value.kind !== 'pending') {
      setPendingUrl(null)
      return
    }
    const url = URL.createObjectURL(value.blob)
    setPendingUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const processed = await processImageFile(file)
      onChange({ kind: 'pending', ...processed })
    } catch {
      setError('Could not process that photo — try a different one.')
    } finally {
      setProcessing(false)
    }
  }

  const previewUrl = value.kind === 'pending' ? pendingUrl : existingUrl

  return (
    <div className="field photo-field">
      <label>Photo</label>
      {previewUrl && (
        <div className="photo-field__preview">
          <img src={previewUrl} alt="" />
          <button type="button" className="btn photo-field__remove" onClick={() => onChange({ kind: 'none' })}>
            Remove photo
          </button>
        </div>
      )}
      <label className="btn photo-field__picker">
        {previewUrl ? 'Change photo' : '+ Add photo'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>
      {processing && <p className="field__hint">Optimizing photo…</p>}
      {error && <p className="field__hint field__hint--error">{error}</p>}
    </div>
  )
}
