import { useRef } from "react"
import * as turf from "@turf/turf"
import type { FeatureCollection } from "geojson"
import { mapRef } from "../lib/mapRef"
import { exportGeoJson, exportPng, exportWkt } from "../lib/export"
import { SAMPLE } from "../lib/sample"
import { EMPTY_FC, useStore } from "../store"

function normalizeToFC(data: any): FeatureCollection {
	if (data && data.type === "FeatureCollection") return data
	if (data && data.type === "Feature") {
		return { type: "FeatureCollection", features: [data] }
	}
	if (data && data.type && data.coordinates) {
		return {
			type: "FeatureCollection",
			features: [{ type: "Feature", properties: {}, geometry: data }],
		}
	}
	throw new Error(
		"Unsupported GeoJSON — expected a FeatureCollection, Feature, or geometry",
	)
}

export default function Toolbar() {
	const fileRef = useRef<HTMLInputElement | null>(null)
	const theme = useStore((s) => s.theme)
	const toggleTheme = useStore((s) => s.toggleTheme)
	const undo = useStore((s) => s.undo)
	const redo = useStore((s) => s.redo)
	const canUndo = useStore((s) => s.past.length > 0)
	const canRedo = useStore((s) => s.future.length > 0)
	const showInput = useStore((s) => s.showInput)
	const showOutput = useStore((s) => s.showOutput)
	const toggleShowInput = useStore((s) => s.toggleShowInput)
	const toggleShowOutput = useStore((s) => s.toggleShowOutput)
	const drawn = useStore((s) => s.drawn)
	const result = useStore((s) => s.result)

	const sync = () => {
		const draw = mapRef.draw
		if (draw) {
			useStore.getState().setDrawn(draw.getAll() as FeatureCollection, true)
		}
	}

	const setScene = (fc: FeatureCollection, fit: boolean) => {
		const draw = mapRef.draw
		const map = mapRef.map
		if (!draw) return
		draw.set(fc as any)
		useStore.getState().setDrawn(fc, true)
		if (fit && map && fc.features.length > 0) {
			const bb = turf.bbox(fc as any)
			map.fitBounds(
				[
					[bb[0], bb[1]],
					[bb[2], bb[3]],
				],
				{ padding: 60, duration: 500 },
			)
		}
	}

	const onNew = () => {
		mapRef.draw?.deleteAll()
		useStore.getState().setDrawn(EMPTY_FC, true)
	}

	const onOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files && e.target.files[0]
		e.target.value = ""
		if (!file) return
		file.text().then((text) => {
			try {
				setScene(normalizeToFC(JSON.parse(text)), true)
			} catch (err) {
				useStore
					.getState()
					.setError(
						err instanceof Error ? err.message : "Invalid GeoJSON file",
					)
			}
		})
	}

	const changeMode = (mode: string) => {
		const draw = mapRef.draw as any
		if (draw) draw.changeMode(mode)
	}

	const addRect = () => {
		const map = mapRef.map
		const draw = mapRef.draw
		if (!map || !draw) return
		const b = map.getBounds()
		const w = b.getEast() - b.getWest()
		const h = b.getNorth() - b.getSouth()
		const c = map.getCenter()
		const poly = turf.bboxPolygon([
			c.lng - w / 6,
			c.lat - h / 6,
			c.lng + w / 6,
			c.lat + h / 6,
		])
		draw.add(poly as any)
		sync()
	}

	const addCircle = () => {
		const map = mapRef.map
		const draw = mapRef.draw
		if (!map || !draw) return
		const c = map.getCenter()
		const b = map.getBounds()
		const radiusKm =
			turf.distance([b.getWest(), c.lat], [b.getEast(), c.lat], {
				units: "kilometers",
			}) / 8
		const circle = turf.circle([c.lng, c.lat], Math.max(radiusKm, 0.05), {
			steps: 64,
			units: "kilometers",
		})
		draw.add(circle as any)
		sync()
	}

	const onDuplicate = () => {
		const draw = mapRef.draw
		if (!draw) return
		const sel = draw.getSelected() as FeatureCollection
		if (sel.features.length === 0) return
		for (const f of sel.features) {
			const moved = turf.transformTranslate(f as any, 1, 135, {
				units: "kilometers",
			})
			delete (moved as any).id
			draw.add(moved as any)
		}
		sync()
	}

	return (
		<header className="toolbar">
			<div className="brand">
				<span className="brand-mark">⬡</span>
				<span className="brand-name">GeoLab</span>
				<span className="brand-tag">Experiment with geometry. Instantly.</span>
			</div>

			<div className="tool-group">
				<button onClick={onNew} title="Clear everything">New</button>
				<button onClick={() => fileRef.current?.click()} title="Open a GeoJSON file">
					Open
				</button>
				<button onClick={() => setScene(SAMPLE, true)} title="Load a demo scene">
					Sample
				</button>
				<input
					ref={fileRef}
					type="file"
					accept=".json,.geojson,application/geo+json"
					className="hidden"
					onChange={onOpen}
				/>
			</div>

			<div className="tool-group">
				<button onClick={() => changeMode("simple_select")} title="Select / move">
					Select
				</button>
				<button onClick={() => changeMode("draw_point")}>Point</button>
				<button onClick={() => changeMode("draw_line_string")}>Line</button>
				<button onClick={() => changeMode("draw_polygon")}>Polygon</button>
				<button onClick={addRect}>Rect</button>
				<button onClick={addCircle}>Circle</button>
			</div>

			<div className="tool-group">
				<button onClick={onDuplicate} title="Duplicate selection">Duplicate</button>
				<button onClick={() => mapRef.draw?.trash()} title="Delete selection">
					Delete
				</button>
				<button onClick={undo} disabled={!canUndo} title="Undo">↶ Undo</button>
				<button onClick={redo} disabled={!canRedo} title="Redo">↷ Redo</button>
			</div>

			<details className="menu">
				<summary>Export</summary>
				<div className="menu-list">
					<button onClick={() => exportGeoJson(drawn, "geolab-input")}>
						GeoJSON — input
					</button>
					<button
						disabled={!result}
						onClick={() => result && exportGeoJson(result.output, "geolab-result")}
					>
						GeoJSON — result
					</button>
					<button
						disabled={!result}
						onClick={() => result && exportWkt(result.output, "geolab-result")}
					>
						WKT — result
					</button>
					<button onClick={() => exportPng("geolab-map")}>PNG — map</button>
				</div>
			</details>

			<div className="tool-group layers">
				<label>
					<input type="checkbox" checked={showInput} onChange={toggleShowInput} />
					Input
				</label>
				<label>
					<input
						type="checkbox"
						checked={showOutput}
						onChange={toggleShowOutput}
					/>
					Output
				</label>
			</div>

			<button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
				{theme === "dark" ? "☀" : "🌙"}
			</button>
		</header>
	)
}
