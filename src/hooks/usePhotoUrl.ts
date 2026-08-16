import { useEffect, useState } from 'react'
import { photoRepository } from '../repositories'

/** Loads the Blob for a stored photo and returns a live object URL,
 *  revoking it automatically when the id changes or the component
 *  unmounts. Returns null while loading or when photoId is null. */
export function usePhotoUrl(photoId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    photoRepository.get(photoId).then((photo) => {
      if (cancelled || !photo) return
      objectUrl = URL.createObjectURL(photo.blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  return url
}
