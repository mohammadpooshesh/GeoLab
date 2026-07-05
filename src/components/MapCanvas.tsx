import { useEffect, useMemo, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import type { FeatureCollection } from "geojson"
import { mapRef } from "../lib/mapRef"
import { EMPTY_FC, useStore } from "../store"

// Make Mapbox GL Draw work with MapLibre's CSS class names
const drawClasses = (MapboxDraw as any).constants.classes
drawClasses.CANVAS = "maplibregl-canvas"
drawClasses.CONTROL_BASE = "maplibregl-ctrl"
drawClasses.CONTROL_PREFIX = "maplibregl-ctrl-"
drawClasses.CONTROL_GROUP = "maplibregl-ctrl-group"
drawClasses.ATTRIBUTION = "maplibregl-ctrl-attrib"

const ACCENT = "#5E9FE8"
const DARK_BG = "#191919"
const LIGHT_BG = "#F6F5F4"
const ATTRIBUTION =
	"\u00a9 OpenStreetMap contributors \u00a9 CARTO"

function tileUrls(theme: string): string[] {
	const variant = theme === "dark" ? "dark_all" : "light_all"
	return ["a", "b", "c"].map(
		(sub) =>
			`https://${sub}.basemaps.cartocdn.com/${variant}/` +
			"{z}/{x}/{y}@2x.png",
	)
}

// Inline style (instead of setStyle) so theme switches never destroy draw layers
function baseStyle(theme: string): any {
	return {
		version: 8,
		sources: {
			"carto-tiles": {
				type: "raster",
				tiles: tileUrls(theme),
				tileSize: 256,
				attribution: ATTRIBUTION,
			},
		},
		layers: [
			{
				id: "background",
				type: "background",
				paint: { "background-color": theme === "dark" ? DARK_BG : LIGHT_BG },
			},
			{ id: "carto", type: "raster", source: "carto-tiles" },
		],
	}
}

function addResultLayers(map: maplibregl.Map): void {
	if (map.getSource("geolab-result")) return
	map.addSource("geolab-result", { type: "geojson", data: EMPTY_FC as any })
	map.addLayer({
		id: "geolab-result-fill",
		type: "fill",
		source: "geolab-result",
		filter: [
			"any",
			["==", ["geometry-type"], "Polygon"],
			["==", ["geometry-type"], "MultiPolygon"],
		],
		paint: { "fill-color": ACCENT, "fill-opacity": 0.35 },
	})
	map.addLayer({
		id: "geolab-result-line",
		type: "line",
		source: "geolab-result",
		paint: { "line-color": ACCENT, "line-width": 2 },
	})
	map.addLayer({
		id: "geolab-result-point",
		type: "circle",
		source: "geolab-result",
		filter: [
			"any",
			["==", ["geometry-type"], "Point"],
			["==", ["geometry-type"], "MultiPoint"],
		],
		paint: {
			"circle-radius": 5,
			"circle-color": ACCENT,
			"circle-stroke-width": 1.5,
			"circle-stroke-color": "#ffffff",
		},
	})
}

export default function MapCanvas() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const [ready, setReady] = useState(false)
	const theme = useStore((s) => s.theme)
	const drawn = useStore((s) => s.drawn)
	const drawnFromMap = useStore((s) => s.drawnFromMap)
	const result = useStore((s) => s.result)
	const frames = useStore((s) => s.frames)
	const timelineT = useStore((s) => s.timelineT)
	const busy = useStore((s) => s.busy)
	const error = useStore((s) => s.error)
	const showInput = useStore((s) => s.showInput)
	const showOutput = useStore((s) => s.showOutput)
	const activeOpId = useStore((s) => s.activeOpId)

	// Initialize map + draw control once
	useEffect(() => {
		if (!containerRef.current || mapRef.map) return

		const map = new maplibregl.Map({
			container: containerRef.current,
			style: baseStyle(useStore.getState().theme),
			center: [54.36, 31.9],
			zoom: 11.5,
			preserveDrawingBuffer: true, // needed for PNG export
		})
		map.addControl(
			new maplibregl.NavigationControl({ showCompass: false }),
			"bottom-right",
		)

		const draw = new MapboxDraw({
			displayControlsDefault: false,
			controls: {},
		})
		map.addControl(draw as unknown as maplibregl.IControl)
		mapRef.map = map
		mapRef.draw = draw

		const sync = () => {
			useStore.getState().setDrawn(draw.getAll() as FeatureCollection, true)
		}
		const mapAny = map as any
		mapAny.on("draw.create", sync)
		mapAny.on("draw.update", sync)
		mapAny.on("draw.delete", sync)
		mapAny.on("draw.selectionchange", () => {
			useStore
				.getState()
				.setSelected(draw.getSelected() as FeatureCollection)
		})

		map.on("load", () => {
			addResultLayers(map)
			setReady(true)
		})

		return () => {
			mapRef.map = null
			mapRef.draw = null
			setReady(false)
			map.remove()
		}
	}, [])

	// Theme switch: swap the raster source + background, keep all other layers
	useEffect(() => {
		const map = mapRef.map
		if (!map || !ready) return
		if (map.getLayer("carto")) map.removeLayer("carto")
		if (map.getSource("carto-tiles")) map.removeSource("carto-tiles")
		map.addSource("carto-tiles", {
			type: "raster",
			tiles: tileUrls(theme),
			tileSize: 256,
			attribution: ATTRIBUTION,
		} as any)
		const layers = map.getStyle().layers || []
		const before = layers.find(
			(l) => l.id !== "background" && l.id !== "carto",
		)
		map.addLayer(
			{ id: "carto", type: "raster", source: "carto-tiles" },
			before ? before.id : undefined,
		)
		map.setPaintProperty(
			"background",
			"background-color",
			theme === "dark" ? DARK_BG : LIGHT_BG,
		)
	}, [theme, ready])

	// Programmatic changes (undo/redo/open/sample) -> push into the draw control
	useEffect(() => {
		const draw = mapRef.draw
		if (!draw || !ready || drawnFromMap) return
		draw.set(drawn as any)
	}, [drawn, drawnFromMap, ready])

	// Pick the frame for the current timeline position (or the final result)
	const displayFC = useMemo<FeatureCollection>(() => {
		if (frames && frames.length > 0) {
			const idx = Math.round(timelineT * (frames.length - 1))
			return frames[Math.min(Math.max(idx, 0), frames.length - 1)]
		}
		return result ? result.output : EMPTY_FC
	}, [result, frames, timelineT])

	useEffect(() => {
		const map = mapRef.map
		if (!map || !ready) return
		const src = map.getSource("geolab-result") as
			| maplibregl.GeoJSONSource
			| undefined
		if (src) src.setData(displayFC as any)
	}, [displayFC, ready])

	// Output visibility + opacity fade for non-animatable operations
	useEffect(() => {
		const map = mapRef.map
		if (!map || !ready || !map.getLayer("geolab-result-fill")) return
		const t = frames ? 1 : timelineT
		const visibility = showOutput ? "visible" : "none"
		for (const id of [
			"geolab-result-fill",
			"geolab-result-line",
			"geolab-result-point",
		]) {
			map.setLayoutProperty(id, "visibility", visibility)
		}
		map.setPaintProperty("geolab-result-fill", "fill-opacity", 0.08 + 0.3 * t)
		map.setPaintProperty("geolab-result-line", "line-opacity", 0.25 + 0.75 * t)
		map.setPaintProperty(
			"geolab-result-point",
			"circle-opacity",
			0.25 + 0.75 * t,
		)
	}, [timelineT, frames, showOutput, ready])

	// Input (drawn features) visibility
	useEffect(() => {
		const map = mapRef.map
		if (!map || !ready) return
		const layers = map.getStyle().layers || []
		for (const l of layers) {
			if (l.id.startsWith("gl-draw")) {
				map.setLayoutProperty(
					l.id,
					"visibility",
					showInput ? "visible" : "none",
				)
			}
		}
	}, [showInput, ready])

	return (
		<div className="map-wrap">
			<div ref={containerRef} className="map-container" />
			{busy && <div className="map-badge">Computing\u2026</div>}
			{error && <div className="map-toast">{error}</div>}
			{drawn.features.length === 0 && (
				<div className="map-hint">
					Draw a shape with the toolbar \u2014 or click Sample to load a demo
					scene.
				</div>
			)}
			{activeOpId === null && drawn.features.length > 0 && (
				<div className="map-hint">Pick an operation from the left panel.</div>
			)}
		</div>
	)
}
