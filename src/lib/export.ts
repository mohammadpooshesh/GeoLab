import type { FeatureCollection } from "geojson"
import { featureCollectionToWkt } from "./wkt"
import { mapRef } from "./mapRef"

function triggerDownload(filename: string, url: string): void {
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
}

export function downloadText(
	filename: string,
	text: string,
	mime = "text/plain;charset=utf-8",
): void {
	const blob = new Blob([text], { type: mime })
	const url = URL.createObjectURL(blob)
	triggerDownload(filename, url)
	window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function exportGeoJson(fc: FeatureCollection, name: string): void {
	downloadText(`${name}.geojson`, JSON.stringify(fc, null, 2), "application/geo+json")
}

export function exportWkt(fc: FeatureCollection, name: string): void {
	downloadText(`${name}.wkt`, featureCollectionToWkt(fc))
}

/** Requires the map to be created with preserveDrawingBuffer: true */
export function exportPng(name: string): void {
	const map = mapRef.map
	if (!map) return
	triggerDownload(`${name}.png`, map.getCanvas().toDataURL("image/png"))
}
