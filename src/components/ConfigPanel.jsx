import { Download, FileArchive, ImagePlus, Loader2, PauseCircle, Play, SlidersHorizontal } from 'lucide-react'
import { APP_CONFIG, GLASS_RGBA } from '../config/appConfig'
import { Button, CheckboxField, Field, Section, SelectInput, TextInput } from './FormControls'

export function ConfigPanel({
  settings,
  targetSize,
  validation,
  runtimeError,
  generation,
  download,
  stats,
  isRunning,
  canGenerate,
  onSettingChange,
  onDimensionChange,
  onToggleGlassColor,
  onGenerate,
  onStopRequest,
}) {
  return (
    <aside className="relative z-30 flex h-svh min-h-0 min-w-0 flex-col bg-zinc-950">
      <div className="shrink-0 border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          <FileArchive className="h-5 w-5 text-violet-300" />
          Glass datapack builder
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Client-side stained glass image generation for Minecraft Java datapacks.
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <fieldset disabled={isRunning} className={`m-0 min-w-0 border-0 p-0 ${isRunning ? 'opacity-60' : ''}`}>
          <Section title="World Options" icon={FileArchive}>
          <Field label="Minecraft version">
            <SelectInput
              value={settings.minecraftVersion}
              onChange={(event) => onSettingChange('minecraftVersion', event.target.value)}
            >
              {APP_CONFIG.minecraftVersions.map((option) => (
                <option key={option.version} value={option.version}>
                  {option.version}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Datapack name" help={APP_CONFIG.help.datapackName}>
              <TextInput
                value={settings.datapackName}
                onChange={(event) => onSettingChange('datapackName', event.target.value)}
              />
            </Field>
            <Field label="Namespace" help={APP_CONFIG.help.namespace}>
              <TextInput
                value={settings.namespace}
                onChange={(event) => onSettingChange('namespace', event.target.value.toLowerCase())}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Base X" help={APP_CONFIG.help.baseX}>
              <TextInput
                type="number"
                value={settings.startX}
                onChange={(event) => onSettingChange('startX', event.target.value)}
              />
            </Field>
            <Field label="Base Y" help={APP_CONFIG.help.baseY}>
              <TextInput
                type="number"
                value={settings.startY}
                onChange={(event) => onSettingChange('startY', event.target.value)}
              />
            </Field>
            <Field label="Base Z" help={APP_CONFIG.help.baseZ}>
              <TextInput
                type="number"
                value={settings.startZ}
                onChange={(event) => onSettingChange('startZ', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Direction" help={APP_CONFIG.help.direction}>
              <SelectInput
                value={settings.layerAxis}
                onChange={(event) => onSettingChange('layerAxis', event.target.value)}
              >
                {APP_CONFIG.layerAxes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Reverse" help={APP_CONFIG.help.reverse}>
              <SelectInput
                value={settings.layerDirection}
                onChange={(event) => onSettingChange('layerDirection', Number(event.target.value))}
              >
                <option value={1}>No</option>
                <option value={-1}>Yes</option>
              </SelectInput>
            </Field>
          </div>

          <Field label="Commands limit" help={APP_CONFIG.help.commandLimit}>
            <TextInput
              type="number"
              value={settings.commandLimit}
              onChange={(event) => onSettingChange('commandLimit', event.target.value)}
            />
          </Field>
          </Section>

          <Section title="Image Resolution" icon={ImagePlus}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Width">
              <TextInput
                type="number"
                min="1"
                value={settings.resultWidth}
                onChange={(event) => onDimensionChange('resultWidth', event.target.value)}
              />
            </Field>
            <Field label="Height">
              <TextInput
                type="number"
                min="1"
                value={settings.resultHeight}
                onChange={(event) => onDimensionChange('resultHeight', event.target.value)}
              />
            </Field>
          </div>
          <CheckboxField
            label="Keep aspect ratio"
            checked={settings.lockAspectRatio}
            onChange={(checked) => onSettingChange('lockAspectRatio', checked)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Resize filter">
              <SelectInput
                value={settings.resizeFilter}
                onChange={(event) => onSettingChange('resizeFilter', event.target.value)}
              >
                {APP_CONFIG.resizeFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Mask filter">
              <SelectInput
                value={settings.buildMaskResizeFilter}
                onChange={(event) => onSettingChange('buildMaskResizeFilter', event.target.value)}
              >
                {APP_CONFIG.resizeFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <CheckboxField
            label="Skip transparent pixels"
            checked={settings.skipTransparentPixels}
            onChange={(checked) => onSettingChange('skipTransparentPixels', checked)}
          />
          <CheckboxField
            label="Clean transparent edges"
            checked={settings.cleanTransparentResizeEdges}
            onChange={(checked) => onSettingChange('cleanTransparentResizeEdges', checked)}
            help={APP_CONFIG.help.cleanTransparentResizeEdges}
          />
          <CheckboxField
            label="Mirror width axis"
            checked={settings.mirrorImageWidthAxis}
            onChange={(checked) => onSettingChange('mirrorImageWidthAxis', checked)}
            help={APP_CONFIG.help.mirrorImageWidthAxis}
          />
          <p className="text-xs text-zinc-500">
            Output size: {targetSize.width} x {targetSize.height} blocks.
          </p>
          </Section>

          <Section title="Glass Solver" icon={SlidersHorizontal}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Min layers" help={APP_CONFIG.help.minMaxLayers}>
              <TextInput
                type="number"
                min="0"
                value={settings.minLayers}
                onChange={(event) => onSettingChange('minLayers', event.target.value)}
              />
            </Field>
            <Field label="Max layers" help={APP_CONFIG.help.minMaxLayers}>
              <TextInput
                type="number"
                min="0"
                value={settings.maxLayers}
                onChange={(event) => onSettingChange('maxLayers', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <span className="text-sm text-zinc-300">Colors</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(GLASS_RGBA).map(([name, rgba]) => (
                <label
                  key={name}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-xs text-zinc-300"
                >
                  <input
                    type="checkbox"
                    checked={settings.glassColorNames.includes(name)}
                    onChange={(event) => onToggleGlassColor(name, event.target.checked)}
                    className="h-3.5 w-3.5 shrink-0 accent-violet-400"
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm border border-black/30"
                    style={{ backgroundColor: `rgb(${rgba[0]}, ${rgba[1]}, ${rgba[2]})` }}
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </div>
          </div>
          </Section>
        </fieldset>

        {stats ? (
          <section className="border-b border-zinc-800 px-5 py-5 text-sm text-zinc-300">
            <h2 className="mb-3 font-medium text-zinc-100">Last generation</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <span>Unique colors: {stats.uniqueColors}</span>
              <span>Palette stacks: {stats.paletteSize}</span>
              <span>Build commands: {stats.buildCommandCount}</span>
              <span>Clear commands: {stats.clearCommandCount}</span>
              <span>Mean layers: {stats.meanLayers.toFixed(2)}</span>
              <span>Mean error: {stats.meanRgbDistance.toFixed(2)}</span>
            </div>
            {stats.exceedsCommandLimit ? (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                One file exceeded the configured command limit. Increase the limit or reduce image size.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/95 p-5 backdrop-blur">
        {validation.length || runtimeError ? (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
            {runtimeError || validation[0]}
          </div>
        ) : null}
        {isRunning ? (
          <div className="grid gap-3">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-400 transition-all"
                style={{ width: `${generation.progress}%` }}
              />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 truncate text-sm text-zinc-300">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />
                <span className="truncate">{generation.label}</span>
              </span>
              <Button type="button" variant="danger" onClick={onStopRequest}>
                <PauseCircle className="h-4 w-4" />
                Stop
              </Button>
            </div>
          </div>
        ) : download ? (
          <a
            href={download.url}
            download={download.fileName}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-400 px-4 text-sm font-medium text-zinc-950 transition hover:bg-violet-300"
          >
            <Download className="h-4 w-4" />
            Download {download.fileName}
          </a>
        ) : (
          <button
            type="button"
            disabled={!canGenerate}
            onClick={onGenerate}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-400 px-4 text-sm font-medium text-zinc-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Play className="h-4 w-4" />
            Generate datapack
          </button>
        )}
      </div>
    </aside>
  )
}
