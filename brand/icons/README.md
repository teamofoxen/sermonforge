# SermonForge — App Icons

Drop-in package for assembling `.icns` (macOS) and `.ico` (Windows) icons.

## What's in here

```
icons/
├─ sermonforge-1024.png            ← master 1024×1024 source
├─ sermonforge-icon.svg            ← vector master (with hairline frame)
├─ sermonforge-icon-noframe.svg    ← vector master (frame stripped — use at small sizes)
├─ mac/                            ← Apple iconset PNGs (need rename, see step 1)
│   ├─ icon_16x16.png
│   ├─ icon_16x16_2x.png
│   ├─ icon_32x32.png
│   ├─ icon_32x32_2x.png
│   ├─ icon_128x128.png
│   ├─ icon_128x128_2x.png
│   ├─ icon_256x256.png
│   ├─ icon_256x256_2x.png
│   ├─ icon_512x512.png
│   └─ icon_512x512_2x.png
└─ win/                            ← Windows .ico source PNGs
    ├─ icon-16.png
    ├─ icon-24.png
    ├─ icon-32.png
    ├─ icon-48.png
    ├─ icon-64.png
    ├─ icon-128.png
    └─ icon-256.png
```

The hairline frame is dropped at sizes < 64px so the mark stays legible at favicon size.

---

## Step 1 — Build the macOS `.icns`

Apple requires `@` in the iconset filenames. They're saved here with `_2x` because `@` was disallowed at write time. **Rename, then run `iconutil`:**

```bash
cd icons/mac

# Rename _2x to @2x (Apple's required convention)
for f in *_2x.png; do
  mv "$f" "${f/_2x/@2x}"
done

# Move into a properly named .iconset folder
cd ..
mv mac sermonforge.iconset

# Build the .icns
iconutil -c icns sermonforge.iconset -o sermonforge.icns
```

Result: `icons/sermonforge.icns` — drop into your Electron / Tauri / Xcode app config.

---

## Step 2 — Build the Windows `.ico`

Use ImageMagick (`magick` on v7+, `convert` on v6):

```bash
cd icons/win

magick icon-16.png icon-24.png icon-32.png icon-48.png \
       icon-64.png icon-128.png icon-256.png \
       ../sermonforge.ico
```

Result: `icons/sermonforge.ico` — multi-resolution container with all 7 sizes embedded.

If you don't have ImageMagick:

```bash
# macOS:    brew install imagemagick
# Windows:  winget install ImageMagick.ImageMagick
# Linux:    apt install imagemagick   /   pacman -S imagemagick
```

---

## Step 3 — Wire into your app

### Electron (`electron-builder`)

```jsonc
// package.json
"build": {
  "mac":   { "icon": "icons/sermonforge.icns" },
  "win":   { "icon": "icons/sermonforge.ico"  },
  "linux": { "icon": "icons/sermonforge-1024.png" }
}
```

### Tauri (`tauri.conf.json`)

```jsonc
"bundle": {
  "icon": [
    "icons/sermonforge-1024.png",
    "icons/sermonforge.ico",
    "icons/sermonforge.icns"
  ]
}
```

Tauri can also generate the full set itself from the 1024 master:

```bash
tauri icon icons/sermonforge-1024.png
```

### Web favicon

```html
<link rel="icon" type="image/svg+xml" href="icons/sermonforge-icon-noframe.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="icons/win/icon-32.png" />
<link rel="apple-touch-icon" href="icons/mac/icon_256x256.png" />
```

---

## Regenerating

The master is `sermonforge-icon.svg`. If you tweak it and want fresh PNGs without re-running the project, ImageMagick can rasterize:

```bash
magick -background none -density 1024 sermonforge-icon.svg -resize 1024x1024 sermonforge-1024.png
```

For a clean iconset rebuild:

```bash
for s in 16 32 64 128 256 512 1024; do
  magick -background none sermonforge-icon.svg -resize ${s}x${s} icon_${s}.png
done
```
