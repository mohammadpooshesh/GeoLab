import * as turf from "@turf/turf"
import type { Feature, Geometry } from "geojson"
import type { Measurement } from "../types"

export function countVertices(g: Geometry | null | undefined): number {
	if (!g) return 0
	if (g.type === "GeometryCollection") {
		return g.geometries.reduce((s, x) => s + countVertices(x), 0)
	}
	const walk = (c: unknown): number => {
		if (!Array.isArray(c)) return 0
		if (typeof c[0] === "number") return 1
		return c.reduce((s: number, x) => s + walk(x), 0)
	}
	return walk((g as { coordinates?: unknown }).coordinates)
}

export function formatArea(m2: number): string {
	return m2 >= 1_000_000
		? `${(m2 / 1_000_000).toFixed(3)} km²`
		: `${m2.toFixed(1)} m²`
}

export function formatLength(km: number): string {
	return km >= 1 ? `${km.toFixed(3)} km` : `${(km * 1000).toFixed(1)} m`
}

/** Human-readable stats for a single feature (used by the Inspector). */
export function describeFeature(f: Feature): Measurement[] {
	const out: Measurement[] = []
	const g = f.geometry
	if (!g) return out
	out.push({ label: "Geometry type", value: g.type })
	out.push({ label: "Vertices", value: String(countVertices(g)) })
	try {
		if (g.type === "Polygon" || g.type === "MultiPolygon") {
			out.push({ label: "Area", value: formatArea(turf.area(f)) })
			const outline = turf.polygonToLine(f as never)
			out.push({
				label: "Perimeter",
				value: formatLength(turf.length(outline as never, { units: "kilometers" })),
			})
		}
		if (g.type === "LineString" || g.type === "MultiLineString") {
			out.push({
				label: "Length",
				value: formatLength(turf.length(f as never, { units: "kilometers" })),
			})
		}
		if (g.type !== "Point") {
			const bb = turf.bbox(f)
			out.push({ label: "Bounds", value: bb.map((n) => n.toFixed(5)).join(", ") })
		}
		const c = turf.center(f).geometry.coordinates
		out.push({ label: "Center", value: `${c[0].toFixed(5)}, ${c[1].toFixed(5)}` })
	} catch {
		// measurement failures are non-fatal
	}
	return out
}
