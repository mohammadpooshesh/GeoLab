import type { FeatureCollection } from "geojson"

/** Demo scene around Yazd, Iran: two overlapping polygons, a line, and points. */
export const SAMPLE: FeatureCollection = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: { name: "Polygon A" },
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[54.3, 31.86],
						[54.37, 31.86],
						[54.37, 31.92],
						[54.3, 31.92],
						[54.3, 31.86],
					],
				],
			},
		},
		{
			type: "Feature",
			properties: { name: "Polygon B" },
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[54.34, 31.885],
						[54.41, 31.885],
						[54.415, 31.94],
						[54.345, 31.945],
						[54.34, 31.885],
					],
				],
			},
		},
		{
			type: "Feature",
			properties: { name: "Route" },
			geometry: {
				type: "LineString",
				coordinates: [
					[54.28, 31.95],
					[54.33, 31.9],
					[54.38, 31.912],
					[54.43, 31.87],
				],
			},
		},
		{
			type: "Feature",
			properties: { name: "P1" },
			geometry: { type: "Point", coordinates: [54.32, 31.88] },
		},
		{
			type: "Feature",
			properties: { name: "P2" },
			geometry: { type: "Point", coordinates: [54.36, 31.9] },
		},
		{
			type: "Feature",
			properties: { name: "P3" },
			geometry: { type: "Point", coordinates: [54.39, 31.93] },
		},
		{
			type: "Feature",
			properties: { name: "P4" },
			geometry: { type: "Point", coordinates: [54.35, 31.862] },
		},
		{
			type: "Feature",
			properties: { name: "P5" },
			geometry: { type: "Point", coordinates: [54.31, 31.932] },
		},
	],
}
