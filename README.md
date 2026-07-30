# WaveFilter

A browser-based AR filter platform for video calls — inspired by Snapchat/Apple Vision Pro
hand-gesture filters. Upload an image, GIF, or video, bind it to a hand gesture, and it
composites live onto your webcam feed whenever that gesture is detected.

## Pages

- **Filter Builder** (`/builder`) — upload a PNG/GIF/MP4, pick one of 12 trigger gestures,
  and configure overlay position (face / background / full-screen / hand-attached), blend
  mode, scale, and duration (hold vs. toggle).
- **Live Session** (`/live`) — full-screen webcam composite with a hand-skeleton debug overlay
  and gesture badge, a bottom strip of all configured gesture→filter pairs, and a toggle
  between Preview Mode and Virtual Cam Mode (with in-app OBS/Meet/Zoom routing instructions).
- **Filter Library** (`/library`) — grid of saved filter packs; import/export as `.wavepack`
  JSON bundles.

## How gesture detection works

`@mediapipe/hands` extracts 21 hand landmarks per detected hand. Each frame, the landmarks are
normalized (translated to the wrist, mirrored so both hands share one coordinate space, rotated
so the wrist→middle-knuckle vector points "up," and scaled by that same distance) and compared
via cosine similarity against 12 hardcoded gesture fingerprints — procedurally generated poses
(`src/data/gestures.ts`, `src/lib/gestureMatcher.ts`) rather than hand-tuned coordinates, so the
same generator also draws the gesture icons throughout the UI. A match requires similarity
≥ 0.85 (`GESTURE_MATCH_THRESHOLD`). Both hands are tracked simultaneously.

## Compositing

A 2D canvas (`src/lib/compositor.ts`) is layered over the webcam `<video>` element:

- **Image / GIF / video** assets are all normalized behind a common `LoadedAsset` interface
  (`src/lib/assetSource.ts`); GIFs are decoded and looped via `gifuct-js`.
- **Hand-attached** filters anchor to the palm-center landmark average and rotate with the
  wrist→middle-knuckle vector.
- **Background** filters use `@mediapipe/selfie_segmentation` to mask the subject out of the
  video so the filter reads as sitting behind them.
- Filter appearance/disappearance fades over 300ms, and duration mode (hold vs. toggle) is
  tracked per filter, per gesture rising-edge.
- `canvas.captureStream(30)` exposes the composited output as a live `MediaStream` for virtual
  camera use — see the in-app instructions on the Live Session page's Virtual Cam Mode panel for
  routing it into OBS Virtual Camera, Google Meet, or Zoom Web.

## Loading MediaPipe

`@mediapipe/hands` and `@mediapipe/selfie_segmentation` ship as Closure-compiled scripts with no
real ESM/CJS exports — they only attach to `window`. They're loaded as classic `<script>` tags
from a CDN in `index.html` and consumed as typed globals (`src/mediapipe-globals.d.ts`) rather
than `import`ed, since a bundler can't statically link them.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```

Filter packs (including embedded asset data) persist to IndexedDB in the browser, so large
video/GIF assets don't run into `localStorage`'s size limits.
