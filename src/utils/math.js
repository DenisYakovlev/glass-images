export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function numberValue(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
