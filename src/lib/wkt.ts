import type { Feature, FeatureCollection, Geometry, Position } from "geojson"

const pos = (c: Position): string => `${c[0]} ${c[1]}`
const ring = (r: Position[]): string => `(${r.map(pos).join(", ")})`

export function geometryToWkt(g: Geometry): string {
	switch (g.type) {
		case "Point":
			return `POINT (${pos(g.coordinates)})`
		case "MultiPoint":
			return `MULTIPOINT (${g.coordinates.map((c) => `(${pos(c)})`).join(", ")})`
		case "LineString":
			return `LINESTRING ${ring(g.coordinates)}`
		case "MultiLineString":
			return `MULTILINESTRING (${g.coordinates.map(ring).join(", ")})`
		case "Polygon":
			return `POLYGON (${g.coordinates.map(ring).join(", ")})`
		case "MultiPolygon":
			return `MULTIPOLYGON (${g.coordinates
				.map((p) => `(${p.map(ring).join(", ")})`)
				.join(", ")})`
		case "GeometryCollection":
			return `GEOMETRYCOLLECTION (${g.geometries.map(geometryToWkt).join(", ")})`
		default:
			return ""
	}
}

export function featureToWkt(f: Feature): string {
	return f.geometry ? geometryToWkt(f.geometry) : ""
}

export function featureCollectionToWkt(fc: FeatureCollection): string {
	return fc.features.map(featureToWkt).filter(Boolean).join("\n")
}
