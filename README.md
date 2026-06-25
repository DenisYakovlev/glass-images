# Glass image builder

Glass image builder is a browser app for converting images into Minecraft stained glass schematics. It lets you import an image, resize it to block dimensions, preview the generated result, tune solver settings, and download a `.schem` file.

The app runs client-side with React, Vite, Canvas, and a Web Worker. Image processing and schematic generation happen in the browser.

## Features

- Import images by file picker, drag and drop, or clipboard paste.
- Resize images by Minecraft block width and height.
- Keep aspect ratio by recalculating width from the selected height.
- Preview the image and generated stained glass approximation.
- Reverse image orientation while keeping schematic-facing behavior aligned with Minecraft placement.
- Generate Sponge-style `.schem` files for Minecraft stained glass builds.
- Use fast solving with a precomputed lookup table for practical browser performance.

## How Generation Works

The input image is resized to the requested block dimensions on a canvas. Transparent pixels are handled with a build mask, so pixels that should not become blocks can be skipped. Each buildable pixel is converted into an RGB target color.

For fast solving, the app uses a q32 lookup table stored in `public/lut_q32.glut`. The q32 format quantizes RGB into 32 levels per channel by taking the upper 5 bits of each color channel. That creates `32 * 32 * 32` possible color buckets, which is small enough to precompute and fast enough to query in the browser.

During generation, each resized image pixel is mapped to a q32 color bucket. The lookup table returns a good stained glass stack for that bucket, including the glass colors and layer count. The worker streams preview overlay batches back to the UI while it solves, then writes the final block palette and block data into a compressed schematic blob.

For non-fast solving, the worker groups pixels by exact target RGB color and searches candidate stained glass stacks from the enabled Minecraft glass colors. This can produce more customized results, but it is slower for large images.

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run build
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
