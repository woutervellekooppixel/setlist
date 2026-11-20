# Setlist

One wide image becomes a setlist of slides. Formerly called Export Every X.

A free Photoshop plugin that slices a wide canvas into evenly sized panels every X pixels, in one operation. No guides, no manual cropping, no repetitive File › Export As.

Built for Instagram carousels, web banners, panoramic layouts and anything else where Photoshop's built-in export workflow starts to feel like a workaround.

Setlist used to be a paid plugin, called Export Every X. It is now free and open source under the MIT license, and part of [All Access](https://www.wouter.photo/tools), free tools for photographers by Wouter Vellekoop.

## Features

- **Any pixel interval.** Set X to whatever your layout needs: 1080 px for carousels, 1920 px for banners, or anything in between. One setting, consistent output.
- **Perfect alignment.** Every panel starts exactly where the previous one ended. No overlap, no gap, no manual adjustment after the fact.
- **Full resolution output.** Panels are exported at the document's own pixel resolution and full height. No downscaling.
- **Replaces the guide workflow.** No guides, no manual slicing, no File › Export As per section. One operation handles the whole document.
- **Works on very wide canvases.** Export As and Save for Web can behave unexpectedly on extremely wide files. Setlist handles them reliably.

## Requirements

- Adobe Photoshop 23.3 or later, desktop version, on macOS or Windows.
- Not available for Photoshop on iPad.

## Install

> **Not tested yet:** version 1.1.0 has not been tested in Photoshop yet. Compared with 1.0.3, the last tested version, it only fixes an error when the panel loads and has the new name.

### From Terminal (Mac)

One line. The Creative Cloud desktop app opens and installs the plugin in Photoshop:

```sh
curl -fsSL https://github.com/woutervellekooppixel/setlist/releases/latest/download/Setlist.ccx -o /tmp/Setlist.ccx && open /tmp/Setlist.ccx
```

### Option 1: install the package (recommended)

1. Download [`dist/setlist-1.1.0.ccx`](dist/setlist-1.1.0.ccx).
2. Double-click the `.ccx` file. The Creative Cloud desktop app opens and asks to install the plugin locally. Confirm.
3. Restart Photoshop.
4. Open the panel from the **Plugins** menu: **Plugins › Setlist**. If it is not there, check that the Creative Cloud desktop app shows the plugin as installed.

### Option 2: load the source with UXP Developer Tool

For developers who want to run or change the code.

1. Install **UXP Developer Tool** from the Creative Cloud desktop app.
2. In Photoshop, enable Developer Mode in the Plugins preferences, so the **Plugins › Development** menu becomes available.
3. In UXP Developer Tool, click **Add Plugin…** and select `plugin/manifest.json` from this repository (or from the unzipped `dist/setlist-1.1.0.zip`).
4. Click **Load**, then open **Plugins › Setlist** in Photoshop.

## How to use

1. Open the wide document you want to slice.
2. Open the panel: **Plugins › Setlist**.
3. **Crop width (X, px):** the width of one panel, for example `1080` for an Instagram carousel or `1920` for a web banner. The default is 1080.
4. **Number of crops:** defaults to the maximum number of full panels that fit. Enter a lower number to export only the first panels, counted from the left.
5. **Destination:** click **Browse** and choose the output folder.
6. Click **Export**.

Every panel is saved as a separate JPEG at maximum quality and full document height, named `crop_01.jpg`, `crop_02.jpg`, and so on.

Good to know:

- The number of panels is the document width divided by X, rounded down. A 3240 px wide canvas with X set to 1080 gives three panels. Pixels on the right that do not fill a complete panel are skipped; the panel tells you how many.
- Files with the same name in the destination folder are overwritten.
- Each panel is cut from a temporary duplicate, so your open document is not changed.
- If you see a permission prompt, that is expected: the plugin only asks for access to the folder you pick.

## FAQ

**Can I export Instagram carousel slices (1080 px / 1080×1350)?**
Yes. Set X to 1080 to export a long design into 1080 px wide panels. Your document height can be whatever you need.

**How do I split a panorama into equal parts?**
Set X to your panel width (for example 1920) and run the export. You get one file per segment, with consistent alignment across all of them.

**Why not just use Photoshop slices?**
For very wide documents, slice-based workflows get tedious fast: guides, manual slice management, and Save for Web can be unreliable on big files. Setlist focuses on fast, consistent panel exports by pixel interval.

**Is this the same as artboards?**
Not quite. Artboards are great when you can structure your design as separate boards from the start. Setlist is for a single wide canvas where you want evenly sized exports without restructuring the file.

## Privacy

Setlist runs locally inside Photoshop. It does not send data over the network, does not collect analytics, and only accesses the folder you select with the folder picker.

## Reporting a bug

Open an issue in this repository and include:

- Photoshop version
- OS version (macOS or Windows)
- Document pixel dimensions (W × H)
- The X value you used
- What you expected and what happened

## Development

Setlist is a UXP panel plugin (manifest version 5) for Photoshop:

- `plugin/manifest.json`: plugin ID, version, host (Photoshop 23.3+) and the folder-picker permission (`localFileSystem: "request"`).
- `plugin/index.html` and `plugin/styles.css`: the panel UI, built with Spectrum web components.
- `plugin/main.js`: the export logic, using the `photoshop` and `uxp` modules.

To make a new package, load the plugin in UXP Developer Tool and choose **Package** from the plugin's actions menu (`•••`). This creates a `.ccx` file. Bump `version` in `manifest.json` for every release.

The files in `dist/` were made from the `plugin/` folder:

```sh
# .ccx: the plugin files at the root of a zip archive
cd plugin && zip -X -D -r ../dist/setlist-1.1.0.ccx manifest.json index.html main.js styles.css icons && cd ..

# .zip: the plugin folder itself, for UXP Developer Tool
ditto -c -k --keepParent --norsrc --noextattr --noqtn --noacl plugin dist/setlist-1.1.0.zip
```

The `id` in `manifest.json` is the plugin ID that Adobe assigned to Setlist. If you publish your own fork, request your own plugin ID from Adobe and replace it.

## License

MIT. See [LICENSE](LICENSE).

Made by Wouter Vellekoop.
