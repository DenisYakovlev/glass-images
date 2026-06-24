import { numberValue } from './math'

export function calculateHeightForWidth(image, width) {
  if (!image?.width || !image?.height) return 1
  return Math.max(1, Math.round(image.height * (numberValue(width, 1) / image.width)))
}

export function calculateWidthForHeight(image, height) {
  if (!image?.width || !image?.height) return 1
  return Math.max(1, Math.round(image.width * (numberValue(height, 1) / image.height)))
}
