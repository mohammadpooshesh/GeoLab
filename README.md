# ⬡ GeoLab — Interactive GIS Geometry Laboratory

**Experiment with geometry. Instantly.**

GeoLab is a browser-only playground for GIS geometry operations — what **regex101** is for regular expressions and **SQL Fiddle** is for SQL. Draw shapes on a real map, pick an operation, drag a slider, and watch the result update **live**. No Run button, no server, no installation for end users.

## ✨ Features

- **Live preview** — every edit (drawing, moving a vertex, dragging a slider) recomputes the result instantly, debounced at 120 ms.
- **Animation engine** — operations with a numeric driver (Buffer radius, Rotate angle, Scale factor, Translate distance, Simplify tolerance) are rendered as 24 interpolated frames you can play or scrub on the timeline.
- **~30 operations** in four categories:
  - **Geometry**: Buffer, Union, Intersect, Difference, Symmetric Difference, Clip, Dissolve, Combine…
  - **Measurement**: Area, Length, Perimeter, Distance, Bearing, Center, Centroid, BBox, Envelope
  - **Transform**: Rotate, Scale, Translate, Simplify, Smooth, Truncate
  - **Advanced**: Voronoi, TIN/Delaunay, Convex & Concave Hull, Hex/Square/Triangle/Point grids, Random Points
- **Code generator** — for the current operation and parameters, ready-to-copy equivalent code in **Turf.js**, **Shapely (Python)**, and **PostGIS (SQL)**.
- **Export** — GeoJSON (input or result), WKT, and PNG snapshot of the map.
- **Web Worker** — all Turf.js computation runs off the main thread, so the UI never freezes.
- **Undo / Redo** (50 steps), input/output layer toggles, sample scene, dark & light themes.

## 🗺 Page architecture

```
+------------------------------------------------------------+
|  Toolbar: File | Draw | Edit | Export | Layers | Theme     |
+-----------+------------------------------+-----------------+
|           |                              |                 |
| Operations|          Map Canvas          |    Inspector    |
|  library  |   (MapLibre + Draw tools)    | params · stats  |
|           |                              |  · code panel   |
+-----------+------------------------------+-----------------+
|  Timeline: ▶ Play ────●────── scrub ────── param value  |
+------------------------------------------------------------+
```

## 🚀 Getting started

```bash
git clone https://github.com/mohammadpooshesh/GeoLab.git
cd GeoLab
npm install
npm run dev
```

Open http://localhost:5173 — then click **Sample** in the toolbar and choose **Buffer** from the Operations panel to see the live preview and animation right away.

## 🔨 Build

```bash
npm run build      # production build into dist/
npm run typecheck  # TypeScript type checking
npm run preview    # preview the production build locally
```

## 🌐 Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds the app and publishes `dist/` to GitHub Pages on every push to `main`.

1. Open **Settings → Pages** in this repository.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually).

> Note: GitHub Pages on **private** repositories requires a paid plan — make the repo public or upgrade.

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript + Vite |
| Map | MapLibre GL (CARTO raster basemaps) |
| Drawing | Mapbox GL Draw |
| Geometry | Turf.js v7 (inside a Web Worker) |
| State | zustand |

## 🗺 Roadmap (v2)

- [ ] Simplify algorithm comparison (Douglas–Peucker vs Visvalingam, side by side)
- [ ] Workflow Builder — chain operations into pipelines
- [ ] Macro recorder & replay
- [ ] Shareable links (scene + operation encoded in the URL)
- [ ] Plugin system for custom operations
- [ ] SVG export

## 🇮🇷 درباره پروژه

جئولب یک آزمایشگاه تعاملی برای عملیات هندسی GIS است که کاملاً در مرورگر اجرا میشود. شکل بکشید، عملیات را انتخاب کنید، اسلایدر را تکان دهید و نتیجه را همان لحظه روی نقشه ببینید — همراه با انیمیشن، تایملاین، و تولید خودکار کد معادل در Turf.js، Shapely و PostGIS. همه محاسبات در Web Worker انجام میشود تا رابط کاربری همیشه روان بماند.

## 📄 License

MIT © Mohammad Pooshesh

## 🙏 Credits

[Turf.js](https://turfjs.org) · [MapLibre GL](https://maplibre.org) · [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw) · © OpenStreetMap contributors · © CARTO
