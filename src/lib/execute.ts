import * as turf from "@turf/turf"
import type {
	Feature,
	FeatureCollection,
	MultiPolygon,
	Point,
	Polygon,
} from "geojson"
import type { OpResult, Params } from "../types"
import { countVertices, formatArea } from "./geo"

const fc = (features: Feature[]): FeatureCollection => ({
	type: "FeatureCollection",
	features,
})

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

type Poly = Feature<Polygon | MultiPolygon>

function polygons(input: FeatureCollection): Poly[] {
	return input.features.filter(
		(f) =>
			f.geometry &&
			(f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
	) as Poly[]
}

function points(input: FeatureCollection): Feature<Point>[] {
	return input.features.filter(
		(f) => f.geometry && f.geometry.type === "Point",
	) as Feature<Point>[]
}

function requirePolygons(input: FeatureCollection, n: number): Poly[] {
	const polys = polygons(input)
	if (polys.length < n) {
		throw new Error(`This operation needs at least ${n} polygon(s).`)
	}
	return polys
}

function unionAll(polys: Poly[]): Poly {
	if (polys.length === 1) return polys[0]
	const u = turf.union(fc(polys) as any)
	if (!u) throw new Error("Union produced an empty result.")
	return u as Poly
}

function intersectAll(polys: Poly[]): Poly | null {
	let acc: Poly | null = polys[0]
	for (let i = 1; i < polys.length && acc; i++) {
		acc = (turf.intersect(fc([acc, polys[i]]) as any) as Poly) || null
	}
	return acc
}

function gridGuard(bb: number[], cellSide: number, units: string): void {
	const w = turf.distance([bb[0], bb[1]], [bb[2], bb[1]], { units: units as any })
	const h = turf.distance([bb[0], bb[1]], [bb[0], bb[3]], { units: units as any })
	const cells = (w / cellSide) * (h / cellSide)
	if (!Number.isFinite(cells) || cells > 20000) {
		throw new Error(
			"Cell size is too small for the current extent \u2014 increase it.",
		)
	}
}

/** Runs a single operation synchronously. Called from the Web Worker. */
export function executeOperation(
	opId: string,
	input: FeatureCollection,
	params: Params,
): OpResult {
	const p = params
	const num = (k: string, d = 0): number =>
		typeof p[k] === "number" ? (p[k] as number) : Number(p[k] ?? d)
	const str = (k: string, d = ""): string => String(p[k] ?? d)
	const bool = (k: string): boolean => Boolean(p[k])
	const units = (): any => str("units", "kilometers") as any

	switch (opId) {
		// ---------- Geometry ----------
		case "buffer": {
			const out = turf.buffer(input as any, Math.max(num("radius"), 0.0001), {
				units: units(),
				steps: Math.round(num("steps", 16)),
			})
			return { output: (out as any) ?? EMPTY }
		}
		case "union": {
			const u = unionAll(requirePolygons(input, 2))
			return {
				output: fc([u]),
				measurements: [{ label: "Area", value: formatArea(turf.area(u)) }],
			}
		}
		case "intersect": {
			const acc = intersectAll(requirePolygons(input, 2))
			if (!acc) {
				return {
					output: EMPTY,
					measurements: [{ label: "Result", value: "No overlap" }],
				}
			}
			return {
				output: fc([acc]),
				measurements: [{ label: "Area", value: formatArea(turf.area(acc)) }],
			}
		}
		case "difference": {
			const polys = requirePolygons(input, 2)
			const d = turf.difference(
				fc([polys[0], unionAll(polys.slice(1))]) as any,
			)
			if (!d) {
				return {
					output: EMPTY,
					measurements: [{ label: "Result", value: "Nothing left" }],
				}
			}
			return { output: fc([d as any]) }
		}
		case "symmetricDifference": {
			const polys = requirePolygons(input, 2)
			const u = unionAll(polys)
			const inter = intersectAll(polys)
			if (!inter) return { output: fc([u]) }
			const d = turf.difference(fc([u, inter]) as any)
			return { output: d ? fc([d as any]) : EMPTY }
		}
		case "dissolve": {
			const flat = turf.flatten(fc(requirePolygons(input, 1)) as any)
			return { output: turf.dissolve(flat as any) as any }
		}
		case "clip": {
			if (input.features.length < 2) {
				throw new Error("Draw the shapes, then draw the clip mask last.")
			}
			const mask = input.features[input.features.length - 1]
			const rest = input.features.slice(0, -1)
			const bb = turf.bbox(mask as any)
			const maskPoly = turf.bboxPolygon(bb)
			const out: Feature[] = []
			for (const f of rest) {
				if (!f.geometry) continue
				if (f.geometry.type === "Point") {
					if (turf.booleanPointInPolygon(f as any, maskPoly as any)) out.push(f)
				} else if (f.geometry.type === "MultiPoint") {
					out.push(f)
				} else {
					const clipped = turf.bboxClip(f as any, bb)
					const coords = (clipped.geometry as any).coordinates
					if (coords && coords.length > 0) out.push(clipped as any)
				}
			}
			return { output: fc(out) }
		}
		case "combine": {
			return { output: turf.combine(input as any) as any }
		}
		// ---------- Measurement ----------
		case "area": {
			const polys = requirePolygons(input, 1)
			const total = polys.reduce((s, f) => s + turf.area(f), 0)
			return {
				output: EMPTY,
				measurements: [
					{ label: "Total area", value: formatArea(total) },
					{ label: "Polygons", value: String(polys.length) },
				],
			}
		}
		case "length": {
			let total = 0
			for (const f of input.features) {
				if (!f.geometry) continue
				if (
					f.geometry.type === "LineString" ||
					f.geometry.type === "MultiLineString"
				) {
					total += turf.length(f as any, { units: units() })
				} else if (
					f.geometry.type === "Polygon" ||
					f.geometry.type === "MultiPolygon"
				) {
					total += turf.length(turf.polygonToLine(f as any) as any, {
						units: units(),
					})
				}
			}
			return {
				output: EMPTY,
				measurements: [
					{ label: "Total length", value: `${total.toFixed(3)} ${units()}` },
				],
			}
		}
		case "perimeter": {
			const polys = requirePolygons(input, 1)
			let total = 0
			for (const f of polys) {
				total += turf.length(turf.polygonToLine(f as any) as any, {
					units: units(),
				})
			}
			return {
				output: EMPTY,
				measurements: [
					{ label: "Total perimeter", value: `${total.toFixed(3)} ${units()}` },
				],
			}
		}
		case "bearing": {
			const pts = points(input)
			if (pts.length < 2) throw new Error("Draw at least two points.")
			const b = turf.bearing(pts[0], pts[1])
			const line = turf.lineString([
				pts[0].geometry.coordinates,
				pts[1].geometry.coordinates,
			])
			return {
				output: fc([line as any]),
				measurements: [{ label: "Bearing", value: `${b.toFixed(2)}\u00b0` }],
			}
		}
		case "distance": {
			const pts = points(input)
			if (pts.length < 2) throw new Error("Draw at least two points.")
			const d = turf.distance(pts[0], pts[1], { units: units() })
			const line = turf.lineString([
				pts[0].geometry.coordinates,
				pts[1].geometry.coordinates,
			])
			return {
				output: fc([line as any]),
				measurements: [
					{ label: "Distance", value: `${d.toFixed(3)} ${units()}` },
				],
			}
		}
		case "center": {
			const c = turf.center(input as any)
			const xy = c.geometry.coordinates
			return {
				output: fc([c as any]),
				measurements: [
					{ label: "Center", value: `${xy[0].toFixed(5)}, ${xy[1].toFixed(5)}` },
				],
			}
		}
		case "centroid": {
			const c = turf.centroid(input as any)
			const xy = c.geometry.coordinates
			return {
				output: fc([c as any]),
				measurements: [
					{
						label: "Centroid",
						value: `${xy[0].toFixed(5)}, ${xy[1].toFixed(5)}`,
					},
				],
			}
		}
		case "bbox": {
			const bb = turf.bbox(input as any)
			return {
				output: fc([turf.bboxPolygon(bb) as any]),
				measurements: [
					{ label: "BBox", value: bb.map((n) => n.toFixed(5)).join(", ") },
				],
			}
		}
		case "envelope": {
			return { output: fc([turf.envelope(input as any) as any]) }
		}
		// ---------- Transform ----------
		case "rotate": {
			const pivot = turf.centroid(input as any).geometry.coordinates
			const out = turf.transformRotate(input as any, num("angle"), {
				pivot: pivot as any,
			})
			return { output: out as any }
		}
		case "scale": {
			const out = turf.transformScale(
				input as any,
				Math.max(num("factor", 1.5), 0.01),
				{ origin: "centroid" },
			)
			return { output: out as any }
		}
		case "translate": {
			const out = turf.transformTranslate(
				input as any,
				num("distance", 50),
				num("direction", 45),
				{ units: units() },
			)
			return { output: out as any }
		}
		case "flip": {
			return { output: turf.flip(input as any) as any }
		}
		case "simplify": {
			const before = input.features.reduce(
				(s, f) => s + countVertices(f.geometry),
				0,
			)
			const out = turf.simplify(input as any, {
				tolerance: Math.max(num("tolerance"), 0),
				highQuality: bool("highQuality"),
			}) as FeatureCollection
			const after = out.features.reduce(
				(s, f) => s + countVertices(f.geometry),
				0,
			)
			return {
				output: out,
				measurements: [
					{ label: "Vertices before", value: String(before) },
					{ label: "Vertices after", value: String(after) },
				],
			}
		}
		case "smooth": {
			const opts = {
				resolution: num("resolution", 10000),
				sharpness: num("sharpness", 0.85),
			}
			const out: Feature[] = []
			for (const f of input.features) {
				if (!f.geometry) continue
				if (f.geometry.type === "LineString") {
					out.push(turf.bezierSpline(f as any, opts) as any)
				} else if (f.geometry.type === "Polygon") {
					const line = turf.polygonToLine(f as any) as any
					const lineFeature =
						line.type === "FeatureCollection" ? line.features[0] : line
					const smoothed = turf.bezierSpline(lineFeature, opts)
					out.push(turf.lineToPolygon(smoothed as any) as any)
				} else {
					out.push(f)
				}
			}
			return { output: fc(out) }
		}
		case "clean": {
			const out = input.features.map((f) =>
				f.geometry ? (turf.cleanCoords(f as any) as any) : f,
			)
			return { output: fc(out) }
		}
		case "truncate": {
			const out = turf.truncate(input as any, {
				precision: Math.round(num("precision", 4)),
			})
			return { output: out as any }
		}
		// ---------- Advanced ----------
		case "voronoi": {
			const pts = points(input)
			if (pts.length < 2) throw new Error("Draw at least two points.")
			const bb = turf.bbox(fc(pts) as any)
			const dx = (bb[2] - bb[0]) * 0.2 + 0.001
			const dy = (bb[3] - bb[1]) * 0.2 + 0.001
			const padded: [number, number, number, number] = [
				bb[0] - dx,
				bb[1] - dy,
				bb[2] + dx,
				bb[3] + dy,
			]
			const v = turf.voronoi(fc(pts) as any, { bbox: padded })
			const cells = (v.features || []).filter(Boolean)
			return {
				output: fc(cells as any),
				measurements: [{ label: "Cells", value: String(cells.length) }],
			}
		}
		case "tin": {
			const pts = points(input)
			if (pts.length < 3) throw new Error("Draw at least three points.")
			const t = turf.tin(fc(pts) as any)
			return {
				output: t as any,
				measurements: [{ label: "Triangles", value: String(t.features.length) }],
			}
		}
		case "convex": {
			const hull = turf.convex(input as any)
			if (!hull) throw new Error("Could not build a convex hull \u2014 add more points.")
			return {
				output: fc([hull as any]),
				measurements: [{ label: "Area", value: formatArea(turf.area(hull)) }],
			}
		}
		case "concave": {
			const pts = points(input)
			if (pts.length < 3) throw new Error("Draw at least three points.")
			const hull = turf.concave(fc(pts) as any, {
				maxEdge: num("maxEdge", 100),
				units: "kilometers",
			})
			if (!hull) {
				return {
					output: EMPTY,
					measurements: [
						{ label: "Result", value: "Empty \u2014 increase Max Edge" },
					],
				}
			}
			return { output: fc([hull as any]) }
		}
		case "hexGrid":
		case "squareGrid":
		case "triangleGrid":
		case "pointGrid": {
			const bb = turf.bbox(input as any)
			const cellSide = Math.max(num("cellSide", 1), 0.001)
			gridGuard(bb, cellSide, str("units", "kilometers"))
			const opts = { units: units() }
			let grid: FeatureCollection
			if (opId === "hexGrid") grid = turf.hexGrid(bb, cellSide, opts) as any
			else if (opId === "squareGrid") grid = turf.squareGrid(bb, cellSide, opts) as any
			else if (opId === "triangleGrid") grid = turf.triangleGrid(bb, cellSide, opts) as any
			else grid = turf.pointGrid(bb, cellSide, opts) as any
			return {
				output: grid,
				measurements: [{ label: "Cells", value: String(grid.features.length) }],
			}
		}
		case "randomPoints": {
			const bb = turf.bbox(input as any)
			const count = Math.min(Math.max(Math.round(num("count", 50)), 1), 500)
			return { output: turf.randomPoint(count, { bbox: bb }) as any }
		}
		default:
			throw new Error(`Unknown operation: ${opId}`)
	}
}
