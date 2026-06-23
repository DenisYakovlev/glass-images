import JSZip from 'jszip'
import { APP_CONFIG, GLASS_RGBA } from '../config/appConfig'

let cancelled = false
const colorCache = new Map()

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0))

function normalizeGlassName(name) {
  return String(name)
    .replace(/^minecraft:/, '')
    .replace(/\.png$/, '')
    .split('/')
    .at(-1)
    .replace(/_stained_glass$/, '')
}

function glassBlockState(name) {
  return `minecraft:${normalizeGlassName(name)}_stained_glass`
}

function blendColorBehindGlass(baseRgb, glassRgba) {
  const [br, bg, bb] = baseRgb
  const [gr, gg, gb, alpha] = glassRgba
  return [
    br * (1 - alpha) + gr * alpha,
    bg * (1 - alpha) + gg * alpha,
    bb * (1 - alpha) + gb * alpha,
  ]
}

function rgbDistanceSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

function rgbDistance(a, b) {
  return Math.sqrt(rgbDistanceSq(a, b))
}

function quantizedColorKey(color, binSize) {
  return color.map((channel) => Math.floor(clamp(Math.round(channel), 0, 255) / binSize)).join(':')
}

function trimSolverBeam(states, beamWidth, binSize) {
  states.sort((a, b) => {
    if (a.distanceSq !== b.distanceSq) return a.distanceSq - b.distanceSq
    if (a.stack.length !== b.stack.length) return a.stack.length - b.stack.length
    return a.stack.join(',').localeCompare(b.stack.join(','))
  })

  if (states.length <= beamWidth) return states

  const kept = []
  const seenBins = new Set()

  for (const state of states) {
    const key = quantizedColorKey(state.color, binSize)
    if (seenBins.has(key)) continue
    seenBins.add(key)
    kept.push(state)
    if (kept.length >= beamWidth) return kept
  }

  const seenStacks = new Set(kept.map((state) => state.stack.join('|')))
  for (const state of states) {
    const key = state.stack.join('|')
    if (seenStacks.has(key)) continue
    kept.push(state)
    if (kept.length >= beamWidth) break
  }

  return kept
}

function solverCacheKey(targetRgb, settings) {
  return JSON.stringify({
    targetRgb,
    glassColorNames: settings.glassColorNames,
    baseBlockRgb: settings.baseBlockRgb,
    minLayers: settings.minLayers,
    maxLayers: settings.maxLayers,
    perColorBeamWidth: settings.perColorBeamWidth,
    solverColorBinSize: settings.solverColorBinSize,
    newLayerMinImprovement: settings.newLayerMinImprovement,
    newLayerMinColorDelta: settings.newLayerMinColorDelta,
    perfectMatchDistance: settings.perfectMatchDistance,
  })
}

function solveTargetColor(targetRgb, glassOptions, settings) {
  const cacheKey = solverCacheKey(targetRgb, settings)
  const cached = colorCache.get(cacheKey)
  if (cached) return cached

  const target = targetRgb.map(Number)
  const baseColor = settings.baseBlockRgb.map(Number)
  const baseState = {
    color: baseColor,
    stack: [],
    distanceSq: rgbDistanceSq(baseColor, target),
  }

  let bestAllowed = settings.minLayers === 0 ? baseState : null
  let currentBeam = [baseState]

  if (bestAllowed && Math.sqrt(bestAllowed.distanceSq) <= settings.perfectMatchDistance) {
    colorCache.set(cacheKey, bestAllowed)
    return bestAllowed
  }

  for (let depth = 1; depth <= settings.maxLayers; depth += 1) {
    const expanded = []

    for (const state of currentBeam) {
      for (const [colorName, glassRgba] of glassOptions) {
        const color = blendColorBehindGlass(state.color, glassRgba)
        expanded.push({
          color,
          stack: [...state.stack, colorName],
          distanceSq: rgbDistanceSq(color, target),
        })
      }
    }

    currentBeam = trimSolverBeam(expanded, settings.perColorBeamWidth, settings.solverColorBinSize)
    if (!currentBeam.length) break

    const depthBest = currentBeam[0]
    const depthBestDistance = Math.sqrt(depthBest.distanceSq)

    if (depthBestDistance <= settings.perfectMatchDistance && depth >= settings.minLayers) {
      colorCache.set(cacheKey, depthBest)
      return depthBest
    }

    if (depth < settings.minLayers) continue

    if (!bestAllowed) {
      bestAllowed = depthBest
      continue
    }

    const previousDistance = Math.sqrt(bestAllowed.distanceSq)
    const improvement = previousDistance - depthBestDistance
    const colorDelta = rgbDistance(bestAllowed.color, depthBest.color)

    if (depthBest.distanceSq < bestAllowed.distanceSq) bestAllowed = depthBest

    if (
      improvement <= settings.newLayerMinImprovement &&
      colorDelta <= settings.newLayerMinColorDelta
    ) {
      break
    }
  }

  if (!bestAllowed) throw new Error('No valid glass stack found for one of the target colors.')
  colorCache.set(cacheKey, bestAllowed)
  return bestAllowed
}

function smoothingQuality(filter) {
  if (filter === 'NEAREST') return { enabled: false, quality: 'low' }
  if (filter === 'BOX' || filter === 'BILINEAR') return { enabled: true, quality: 'low' }
  if (filter === 'HAMMING' || filter === 'BICUBIC') return { enabled: true, quality: 'medium' }
  return { enabled: true, quality: 'high' }
}

function drawImageToCanvas(imageBitmap, width, height, filter) {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const smoothing = smoothingQuality(filter)
  context.imageSmoothingEnabled = smoothing.enabled
  context.imageSmoothingQuality = smoothing.quality
  context.drawImage(imageBitmap, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

function makeBuildMask(imageBitmap, targetWidth, targetHeight, settings) {
  const sourceCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  sourceContext.drawImage(imageBitmap, 0, 0)
  const sourceData = sourceContext.getImageData(0, 0, imageBitmap.width, imageBitmap.height)
  const sourcePixels = sourceData.data

  if (!settings.skipTransparentPixels) {
    return new Uint8Array(targetWidth * targetHeight).fill(1)
  }

  if (!settings.cleanTransparentResizeEdges) {
    const resized = drawImageToCanvas(imageBitmap, targetWidth, targetHeight, settings.resizeFilter)
    const mask = new Uint8Array(targetWidth * targetHeight)
    for (let index = 0; index < mask.length; index += 1) {
      mask[index] = resized.data[index * 4 + 3] > settings.transparentAlphaThreshold ? 1 : 0
    }
    return mask
  }

  const hardAlpha = sourceContext.createImageData(imageBitmap.width, imageBitmap.height)
  for (let index = 0; index < imageBitmap.width * imageBitmap.height; index += 1) {
    const alpha = sourcePixels[index * 4 + 3]
    const value = alpha > settings.transparentAlphaThreshold ? 255 : 0
    hardAlpha.data[index * 4] = value
    hardAlpha.data[index * 4 + 1] = value
    hardAlpha.data[index * 4 + 2] = value
    hardAlpha.data[index * 4 + 3] = 255
  }
  sourceContext.putImageData(hardAlpha, 0, 0)

  const targetCanvas = new OffscreenCanvas(targetWidth, targetHeight)
  const targetContext = targetCanvas.getContext('2d', { willReadFrequently: true })
  const smoothing = smoothingQuality(settings.buildMaskResizeFilter)
  targetContext.imageSmoothingEnabled = smoothing.enabled
  targetContext.imageSmoothingQuality = smoothing.quality
  targetContext.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
  const resizedMask = targetContext.getImageData(0, 0, targetWidth, targetHeight).data
  const mask = new Uint8Array(targetWidth * targetHeight)

  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = resizedMask[index * 4] >= settings.buildMaskCoverageThreshold ? 1 : 0
  }

  return mask
}

function prepareTargetImage(imageBitmap, settings) {
  const width = Number(settings.resultWidth)
  const height =
    Number(settings.resultHeight) > 0
      ? Number(settings.resultHeight)
      : Math.max(1, Math.round(imageBitmap.height * (width / imageBitmap.width)))

  const imageData = drawImageToCanvas(imageBitmap, width, height, settings.resizeFilter)
  const mask = makeBuildMask(imageBitmap, width, height, settings)
  const rgb = new Uint8Array(width * height * 3)
  const alphaBackground = settings.alphaBackgroundRgb.map(Number)

  for (let index = 0; index < width * height; index += 1) {
    const sourceIndex = index * 4
    const alpha = imageData.data[sourceIndex + 3] / 255
    const targetIndex = index * 3
    rgb[targetIndex] = Math.round(imageData.data[sourceIndex] * alpha + alphaBackground[0] * (1 - alpha))
    rgb[targetIndex + 1] = Math.round(
      imageData.data[sourceIndex + 1] * alpha + alphaBackground[1] * (1 - alpha),
    )
    rgb[targetIndex + 2] = Math.round(
      imageData.data[sourceIndex + 2] * alpha + alphaBackground[2] * (1 - alpha),
    )
  }

  if (settings.imageMaxColors > 0) {
    const levels = clamp(Math.round(Math.cbrt(settings.imageMaxColors)), 2, 6)
    const step = 255 / (levels - 1)
    for (let index = 0; index < rgb.length; index += 1) {
      rgb[index] = Math.round(Math.round(rgb[index] / step) * step)
    }
  }

  if (settings.mirrorImageWidthAxis) {
    const mirroredRgb = new Uint8Array(rgb.length)
    const mirroredMask = new Uint8Array(mask.length)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceX = width - 1 - x
        const sourcePixel = y * width + sourceX
        const targetPixel = y * width + x
        mirroredMask[targetPixel] = mask[sourcePixel]
        mirroredRgb[targetPixel * 3] = rgb[sourcePixel * 3]
        mirroredRgb[targetPixel * 3 + 1] = rgb[sourcePixel * 3 + 1]
        mirroredRgb[targetPixel * 3 + 2] = rgb[sourcePixel * 3 + 2]
      }
    }

    return { width, height, rgb: mirroredRgb, mask: mirroredMask }
  }

  return { width, height, rgb, mask }
}

function buildColorGroups(target) {
  const groups = new Map()
  let buildablePixels = 0

  for (let index = 0; index < target.width * target.height; index += 1) {
    if (!target.mask[index]) continue
    buildablePixels += 1
    const rgbIndex = index * 3
    const key = `${target.rgb[rgbIndex]},${target.rgb[rgbIndex + 1]},${target.rgb[rgbIndex + 2]}`
    let group = groups.get(key)
    if (!group) {
      group = {
        rgb: [target.rgb[rgbIndex], target.rgb[rgbIndex + 1], target.rgb[rgbIndex + 2]],
        indexes: [],
      }
      groups.set(key, group)
    }
    group.indexes.push(index)
  }

  return { groups: [...groups.values()], buildablePixels }
}

function buildPalette(states) {
  const stackToIndex = new Map()
  const stacks = []
  const colors = []
  const lengths = []
  const indexes = []

  for (const state of states) {
    const key = state.stack.join('|')
    let index = stackToIndex.get(key)
    if (index === undefined) {
      index = stacks.length
      stackToIndex.set(key, index)
      stacks.push(state.stack)
      colors.push(state.color)
      lengths.push(state.stack.length)
    }
    indexes.push(index)
  }

  return { stacks, colors, lengths, indexes }
}

function imageYToBlockY(py, height, settings) {
  if (settings.imageTopToHighY) return Number(settings.startY) + (height - 1 - py)
  return Number(settings.startY) + py
}

function rowFillCommand(py, x0, x1, layerIndex, blockState, area, settings) {
  const y = imageYToBlockY(py, area.height, settings)

  if (settings.layerAxis === 'z') {
    const z =
      layerIndex === null
        ? Number(settings.startZ)
        : Number(settings.startZ) +
          Number(settings.layerDirection) * (layerIndex + 1) * Number(settings.layerStepBlocks)
    return `fill ${Number(settings.startX) + x0} ${y} ${z} ${Number(settings.startX) + x1} ${y} ${z} ${blockState} replace`
  }

  const x =
    layerIndex === null
      ? Number(settings.startX)
      : Number(settings.startX) +
        Number(settings.layerDirection) * (layerIndex + 1) * Number(settings.layerStepBlocks)
  return `fill ${x} ${y} ${Number(settings.startZ) + x0} ${x} ${y} ${Number(settings.startZ) + x1} ${blockState} replace`
}

function appendRunsForRow(lines, py, states, layerIndex, area, settings) {
  let runStart = null
  let runState = null

  for (let px = 0; px < states.length; px += 1) {
    const state = states[px]
    if (state === runState) continue

    if (runState !== null && runStart !== null) {
      lines.push(rowFillCommand(py, runStart, px - 1, layerIndex, runState, area, settings))
    }

    runStart = state === null ? null : px
    runState = state
  }

  if (runState !== null && runStart !== null) {
    lines.push(rowFillCommand(py, runStart, states.length - 1, layerIndex, runState, area, settings))
  }
}

function appendBaseBuildCommands(lines, target, area, settings) {
  if (!settings.placeBaseBlocks) return

  for (let py = 0; py < area.height; py += 1) {
    const states = []
    for (let px = 0; px < area.width; px += 1) {
      states.push(target.mask[py * area.width + px] ? settings.baseBlockState : null)
    }
    appendRunsForRow(lines, py, states, null, area, settings)
  }
}

function appendGlassBuildCommands(lines, target, paletteIndexesByPixel, palette, area, settings) {
  for (let layer = 0; layer < settings.maxLayers; layer += 1) {
    for (let py = 0; py < area.height; py += 1) {
      const states = []
      for (let px = 0; px < area.width; px += 1) {
        const pixelIndex = py * area.width + px
        if (!target.mask[pixelIndex]) {
          states.push(null)
          continue
        }

        const paletteIndex = paletteIndexesByPixel[pixelIndex]
        const stack = palette.stacks[paletteIndex]
        states.push(layer < stack.length ? glassBlockState(stack[layer]) : null)
      }
      appendRunsForRow(lines, py, states, layer, area, settings)
    }
  }
}

function appendClearCommands(lines, area, settings) {
  const minY = Number(settings.startY)
  const maxY = Number(settings.startY) + area.height - 1
  const depthStart = settings.placeBaseBlocks ? 0 : 1
  const depthEnd = Number(settings.maxLayers)

  if (settings.layerAxis === 'z') {
    const x0 = Number(settings.startX)
    const x1 = Number(settings.startX) + area.width - 1
    const z0 = Number(settings.startZ) + Number(settings.layerDirection) * depthStart * Number(settings.layerStepBlocks)
    const z1 = Number(settings.startZ) + Number(settings.layerDirection) * depthEnd * Number(settings.layerStepBlocks)
    lines.push(
      `fill ${Math.min(x0, x1)} ${minY} ${Math.min(z0, z1)} ${Math.max(x0, x1)} ${maxY} ${Math.max(z0, z1)} ${settings.clearBlockState} replace`,
    )
    return
  }

  const x0 = Number(settings.startX) + Number(settings.layerDirection) * depthStart * Number(settings.layerStepBlocks)
  const x1 = Number(settings.startX) + Number(settings.layerDirection) * depthEnd * Number(settings.layerStepBlocks)
  const z0 = Number(settings.startZ)
  const z1 = Number(settings.startZ) + area.width - 1
  lines.push(
    `fill ${Math.min(x0, x1)} ${minY} ${Math.min(z0, z1)} ${Math.max(x0, x1)} ${maxY} ${Math.max(z0, z1)} ${settings.clearBlockState} replace`,
  )
}

function buildMcfunctionFiles(target, paletteIndexesByPixel, palette, stats, settings) {
  const area = { width: target.width, height: target.height }
  const buildLines = [
    '# Generated colored glass image',
    `# Size: ${target.width}x${target.height} blocks`,
    `# Base block: ${settings.placeBaseBlocks ? settings.baseBlockState : 'disabled'}`,
    `# Layers: ${settings.minLayers}..${settings.maxLayers}`,
    `# Buildable pixels: ${stats.buildablePixels}`,
    `# Skipped pixels: ${stats.skippedPixels}`,
    '',
  ]
  const clearLines = ['# Clear generated colored glass image', '']

  appendBaseBuildCommands(buildLines, target, area, settings)
  appendGlassBuildCommands(buildLines, target, paletteIndexesByPixel, palette, area, settings)
  appendClearCommands(clearLines, area, settings)

  return {
    build: `${buildLines.join('\n')}\n`,
    clear: `${clearLines.join('\n')}\n`,
    buildCommandCount: buildLines.filter((line) => line && !line.startsWith('#')).length,
    clearCommandCount: clearLines.filter((line) => line && !line.startsWith('#')).length,
  }
}

function sanitizePathSegment(value, fallback) {
  const segment = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  return segment || fallback
}

async function buildZip(files, settings) {
  const zip = new JSZip()
  const namespace = sanitizePathSegment(settings.namespace, 'glass_image').toLowerCase()
  const version = APP_CONFIG.minecraftVersions.find((option) => option.version === settings.minecraftVersion)

  zip.file(
    'pack.mcmeta',
    `${JSON.stringify(
      {
        pack: {
          pack_format: Number(version?.packFormat ?? APP_CONFIG.minecraft.defaultPackFormat ?? 15),
          description: `${settings.datapackName} generated colored glass image`,
        },
      },
      null,
      2,
    )}\n`,
  )
  zip.file(`data/${namespace}/functions/build.mcfunction`, files.build)
  zip.file(`data/${namespace}/functions/clear.mcfunction`, files.clear)

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

async function generate({ fileBuffer, fileType, settings }) {
  cancelled = false
  const blob = new Blob([fileBuffer], { type: fileType })
  const imageBitmap = await createImageBitmap(blob)
  const target = prepareTargetImage(imageBitmap, settings)
  const { groups, buildablePixels } = buildColorGroups(target)

  if (!buildablePixels) throw new Error('No buildable pixels found. Check transparency settings.')

  self.postMessage({
    type: 'prepared',
    width: target.width,
    height: target.height,
    buildablePixels,
    skippedPixels: target.width * target.height - buildablePixels,
    uniqueColors: groups.length,
  })

  const glassOptions = settings.glassColorNames.map((colorName) => {
    const key = normalizeGlassName(colorName)
    return [key, GLASS_RGBA[key]]
  })
  const paletteIndexesByPixel = new Int32Array(target.width * target.height).fill(-1)
  const solvedStates = []
  const batchIndexes = []
  const batchColors = []

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    if (cancelled) {
      self.postMessage({ type: 'cancelled' })
      return
    }

    const group = groups[groupIndex]
    const state = solveTargetColor(group.rgb, glassOptions, settings)
    solvedStates.push(state)
    const renderedColor = state.color.map((channel) => clamp(Math.round(channel), 0, 255))

    for (const pixelIndex of group.indexes) {
      batchIndexes.push(pixelIndex)
      batchColors.push(renderedColor[0], renderedColor[1], renderedColor[2])
    }

    if ((groupIndex + 1) % 12 === 0 || groupIndex + 1 === groups.length) {
      self.postMessage({
        type: 'overlay',
        solvedColors: groupIndex + 1,
        uniqueColors: groups.length,
        indexes: new Uint32Array(batchIndexes),
        colors: new Uint8ClampedArray(batchColors),
      })
      batchIndexes.length = 0
      batchColors.length = 0
      await sleep()
    }
  }

  const palette = buildPalette(solvedStates)

  groups.forEach((group, groupIndex) => {
    const paletteIndex = palette.indexes[groupIndex]
    for (const pixelIndex of group.indexes) {
      paletteIndexesByPixel[pixelIndex] = paletteIndex
    }
  })

  const usedLengths = []
  for (let index = 0; index < paletteIndexesByPixel.length; index += 1) {
    const paletteIndex = paletteIndexesByPixel[index]
    if (paletteIndex >= 0) usedLengths.push(palette.lengths[paletteIndex])
  }

  const errorSummary = solvedStates.reduce(
    (summary, state) => {
      const error = Math.sqrt(state.distanceSq)
      return {
        sum: summary.sum + error,
        max: Math.max(summary.max, error),
      }
    },
    { sum: 0, max: 0 },
  )
  const lengthSummary = usedLengths.reduce(
    (summary, value) => ({
      sum: summary.sum + value,
      min: Math.min(summary.min, value),
      max: Math.max(summary.max, value),
    }),
    { sum: 0, min: Number.POSITIVE_INFINITY, max: 0 },
  )
  const stats = {
    width: target.width,
    height: target.height,
    totalPixels: target.width * target.height,
    buildablePixels,
    skippedPixels: target.width * target.height - buildablePixels,
    uniqueColors: groups.length,
    paletteSize: palette.stacks.length,
    meanRgbDistance: errorSummary.sum / solvedStates.length,
    maxRgbDistance: errorSummary.max,
    meanLayers: lengthSummary.sum / usedLengths.length,
    minUsedLayers: lengthSummary.min,
    maxUsedLayers: lengthSummary.max,
  }

  const files = buildMcfunctionFiles(target, paletteIndexesByPixel, palette, stats, settings)
  const zipBlob = await buildZip(files, settings)

  self.postMessage({
    type: 'done',
    zipBlob,
    fileName: `${sanitizePathSegment(settings.datapackName, 'glass_image')}.zip`,
    stats: {
      ...stats,
      buildCommandCount: files.buildCommandCount,
      clearCommandCount: files.clearCommandCount,
      commandLimit: settings.commandLimit,
      exceedsCommandLimit:
        files.buildCommandCount > settings.commandLimit || files.clearCommandCount > settings.commandLimit,
    },
  })
}

self.onmessage = (event) => {
  if (event.data?.type === 'cancel') {
    cancelled = true
    return
  }

  if (event.data?.type !== 'generate') return

  generate(event.data).catch((error) => {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  })
}
