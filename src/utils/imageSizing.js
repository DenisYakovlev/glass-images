import { APP_CONFIG } from '../config/appConfig'
import { numberValue } from './math'

export function calculateHeightForWidth(image, width) {
  if (!image?.width || !image?.height) return 1
  return Math.max(1, Math.round(image.height * (numberValue(width, 1) / image.width)))
}

export function calculateWidthForHeight(image, height) {
  if (!image?.width || !image?.height) return 1
  return Math.max(1, Math.round(image.width * (numberValue(height, 1) / image.height)))
}

export function maxHeightFromBaseY(baseY) {
  return Math.max(1, APP_CONFIG.minecraft.maxY - Math.round(numberValue(baseY)) + 1)
}

export function fitImageSizeForBaseY(image, preferredWidth, baseY) {
  const width = Math.max(1, Math.round(numberValue(preferredWidth, APP_CONFIG.defaults.resultWidth)))
  const height = calculateHeightForWidth(image, width)
  const maxHeight = maxHeightFromBaseY(baseY)

  if (height <= maxHeight) {
    return { width, height }
  }

  return {
    width: calculateWidthForHeight(image, maxHeight),
    height: maxHeight,
  }
}
