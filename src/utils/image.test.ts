import { describe, expect, it } from 'vitest'
import { fitWithinMax } from './image'

// This covers the pure resize-dimension math only. The rest of
// processImageFile (createImageBitmap/<img> decode, canvas draw, WebP/JPEG
// encode) needs a real <canvas> implementation that jsdom doesn't provide,
// so it isn't covered here — that part is exercised by hand when actually
// uploading a photo in a browser.
describe('fitWithinMax', () => {
  it('leaves an image unchanged when already within the max dimension', () => {
    expect(fitWithinMax(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('downscales a landscape image so the longest edge equals max, preserving aspect ratio', () => {
    expect(fitWithinMax(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('downscales a portrait image so the longest edge (height) equals max', () => {
    expect(fitWithinMax(2000, 4000, 1600)).toEqual({ width: 800, height: 1600 })
  })

  it('handles a square image correctly', () => {
    expect(fitWithinMax(3000, 3000, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('treats an image exactly at the max as unchanged (boundary case)', () => {
    expect(fitWithinMax(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })
})
