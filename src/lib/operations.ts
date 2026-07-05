import type { OpCategory, OperationDef, ParamDef, Params } from "../types"

const UNITS: ParamDef = {
	key: "units",
	label: "Units",
	type: "select",
	default: "kilometers",
	options: [
		{ value: "meters", label: "Meters" },
		{ value: "kilometers", label: "Kilometers" },
		{ value: "miles", label: "Miles" },
	],
}

export const CATEGORIES: OpCategory[] = [
	"Geometry",
	"Measurement",
	"Transform",
	"Advanced",
]

export const OPERATIONS: OperationDef[] = [
	// ---------- Geometry ----------
	{
		id: "buffer",
		name: "Buffer",
		category: "Geometry",
		description:
			"Creates a new geometry at a fixed distance around (or inside) the original geometry.",
		minFeatures: 1,
		inputHint: "Any geometry.",
		params: [
			{ key: "radius", label: "Radius", type: "number", min: 0, max: 100, step: 0.5, default: 10 },
			UNITS,
			{ key: "steps", label: "Quadrant segments", type: "number", min: 2, max: 64, step: 1, default: 16 },
		],
		animatableParam: "radius",
		animateFrom: 0.01,
	},
	{
		id: "union",
		name: "Union",
		category: "Geometry",
		description: "Merges two or more polygons into a single combined polygon.",
		minFeatures: 2,
		inputHint: "Two or more polygons.",
		params: [],
	},
	{
		id: "intersect",
		name: "Intersect",
		category: "Geometry",
		description: "Returns only the area shared by all input polygons.",
		minFeatures: 2,
		inputHint: "Two or more overlapping polygons.",
		params: [],
	},
	{
		id: "difference",
		name: "Difference",
		category: "Geometry",
		description: "Subtracts the later polygons from the first polygon (A \u2212 B).",
		minFeatures: 2,
		inputHint: "First polygon minus the following ones.",
		params: [],
	},
	{
		id: "symmetricDifference",
		name: "Symmetric Difference",
		category: "Geometry",
		description:
			"Returns the parts of two polygons that do NOT overlap (union minus intersection).",
		minFeatures: 2,
		inputHint: "Two overlapping polygons.",
		params: [],
	},
	{
		id: "dissolve",
		name: "Dissolve",
		category: "Geometry",
		description: "Fuses overlapping or touching polygons into unified shapes.",
		minFeatures: 1,
		inputHint: "One or more polygons.",
		params: [],
	},
	{
		id: "clip",
		name: "Clip (BBox)",
		category: "Geometry",
		description:
			"Clips all features to the bounding box of the LAST drawn feature (the clip mask).",
		minFeatures: 2,
		inputHint: "Draw the clip shape last.",
		params: [],
	},
	{
		id: "combine",
		name: "Combine",
		category: "Geometry",
		description:
			"Combines features of the same type into Multi* geometries (MultiPoint, MultiLineString, MultiPolygon).",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	// ---------- Measurement ----------
	{
		id: "area",
		name: "Area",
		category: "Measurement",
		description: "Calculates the total geodesic area of all polygons.",
		minFeatures: 1,
		inputHint: "Polygons.",
		params: [],
	},
	{
		id: "length",
		name: "Length",
		category: "Measurement",
		description: "Calculates the total length of all lines (and polygon outlines).",
		minFeatures: 1,
		inputHint: "Lines or polygons.",
		params: [UNITS],
	},
	{
		id: "perimeter",
		name: "Perimeter",
		category: "Measurement",
		description: "Calculates the total perimeter of all polygons.",
		minFeatures: 1,
		inputHint: "Polygons.",
		params: [UNITS],
	},
	{
		id: "bearing",
		name: "Bearing",
		category: "Measurement",
		description:
			"Calculates the geographic bearing (in degrees from north) between the first two points.",
		minFeatures: 2,
		inputHint: "At least two points.",
		params: [],
	},
	{
		id: "distance",
		name: "Distance",
		category: "Measurement",
		description: "Calculates the geodesic distance between the first two points.",
		minFeatures: 2,
		inputHint: "At least two points.",
		params: [UNITS],
	},
	{
		id: "center",
		name: "Center",
		category: "Measurement",
		description: "Returns the absolute center (of the bounding box) of all features.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	{
		id: "centroid",
		name: "Centroid",
		category: "Measurement",
		description: "Returns the mean center of all vertices of all features.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	{
		id: "bbox",
		name: "BBox",
		category: "Measurement",
		description: "Computes the bounding box of all features and draws it as a polygon.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	{
		id: "envelope",
		name: "Envelope",
		category: "Measurement",
		description: "Returns the rectangular envelope polygon that encloses all features.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	// ---------- Transform ----------
	{
		id: "rotate",
		name: "Rotate",
		category: "Transform",
		description: "Rotates all features around their collective centroid.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [
			{ key: "angle", label: "Angle (\u00b0)", type: "number", min: -180, max: 180, step: 1, default: 45 },
		],
		animatableParam: "angle",
		animateFrom: 0,
	},
	{
		id: "scale",
		name: "Scale",
		category: "Transform",
		description: "Enlarges or shrinks features by a scale factor from their centroid.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [
			{ key: "factor", label: "Factor", type: "number", min: 0.1, max: 5, step: 0.1, default: 1.5 },
		],
		animatableParam: "factor",
		animateFrom: 1,
	},
	{
		id: "translate",
		name: "Translate",
		category: "Transform",
		description: "Moves all features by a distance along a compass direction.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [
			{ key: "distance", label: "Distance", type: "number", min: 0, max: 200, step: 1, default: 50 },
			{ key: "direction", label: "Direction (\u00b0)", type: "number", min: 0, max: 360, step: 1, default: 45 },
			UNITS,
		],
		animatableParam: "distance",
		animateFrom: 0,
	},
	{
		id: "flip",
		name: "Flip",
		category: "Transform",
		description: "Swaps the X and Y coordinates of every vertex (lon/lat flip).",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	{
		id: "simplify",
		name: "Simplify",
		category: "Transform",
		description:
			"Reduces the number of vertices using the Ramer\u2013Douglas\u2013Peucker algorithm.",
		minFeatures: 1,
		inputHint: "Lines or polygons.",
		params: [
			{ key: "tolerance", label: "Tolerance", type: "number", min: 0, max: 0.2, step: 0.001, default: 0.02 },
			{ key: "highQuality", label: "High quality", type: "boolean", default: false },
		],
		animatableParam: "tolerance",
		animateFrom: 0,
	},
	{
		id: "smooth",
		name: "Smooth",
		category: "Transform",
		description: "Smooths lines and polygon outlines with a Bezier spline.",
		minFeatures: 1,
		inputHint: "Lines or polygons.",
		params: [
			{ key: "resolution", label: "Resolution", type: "number", min: 1000, max: 20000, step: 500, default: 10000 },
			{ key: "sharpness", label: "Sharpness", type: "number", min: 0, max: 1, step: 0.05, default: 0.85 },
		],
	},
	{
		id: "clean",
		name: "Clean",
		category: "Transform",
		description: "Removes redundant (duplicate / collinear) coordinates from features.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [],
	},
	{
		id: "truncate",
		name: "Truncate",
		category: "Transform",
		description: "Rounds coordinates to a fixed number of decimal places.",
		minFeatures: 1,
		inputHint: "Any features.",
		params: [
			{ key: "precision", label: "Decimal places", type: "number", min: 0, max: 12, step: 1, default: 4 },
		],
	},
	// ---------- Advanced ----------
	{
		id: "voronoi",
		name: "Voronoi",
		category: "Advanced",
		description: "Partitions the plane into cells closest to each input point.",
		minFeatures: 2,
		inputHint: "Two or more points.",
		params: [],
	},
	{
		id: "tin",
		name: "TIN (Delaunay)",
		category: "Advanced",
		description:
			"Builds a Triangulated Irregular Network (Delaunay triangulation) from points.",
		minFeatures: 3,
		inputHint: "Three or more points.",
		params: [],
	},
	{
		id: "convex",
		name: "Convex Hull",
		category: "Advanced",
		description: "Computes the smallest convex polygon that encloses all vertices.",
		minFeatures: 1,
		inputHint: "Any features with 3+ total vertices.",
		params: [],
	},
	{
		id: "concave",
		name: "Concave Hull",
		category: "Advanced",
		description: "Computes a concave hull around input points (tighter than convex).",
		minFeatures: 3,
		inputHint: "Three or more points.",
		params: [
			{ key: "maxEdge", label: "Max edge (km)", type: "number", min: 1, max: 500, step: 1, default: 100 },
		],
	},
	{
		id: "hexGrid",
		name: "Hex Grid",
		category: "Advanced",
		description: "Fills the bounding box of the input with a hexagonal grid.",
		minFeatures: 1,
		inputHint: "Any features (defines the extent).",
		params: [
			{ key: "cellSide", label: "Cell side", type: "number", min: 0.1, max: 50, step: 0.1, default: 1 },
			UNITS,
		],
	},
	{
		id: "squareGrid",
		name: "Square Grid",
		category: "Advanced",
		description: "Fills the bounding box of the input with a square grid.",
		minFeatures: 1,
		inputHint: "Any features (defines the extent).",
		params: [
			{ key: "cellSide", label: "Cell side", type: "number", min: 0.1, max: 50, step: 0.1, default: 1 },
			UNITS,
		],
	},
	{
		id: "triangleGrid",
		name: "Triangle Grid",
		category: "Advanced",
		description: "Fills the bounding box of the input with a triangular grid.",
		minFeatures: 1,
		inputHint: "Any features (defines the extent).",
		params: [
			{ key: "cellSide", label: "Cell side", type: "number", min: 0.1, max: 50, step: 0.1, default: 1 },
			UNITS,
		],
	},
	{
		id: "pointGrid",
		name: "Point Grid",
		category: "Advanced",
		description: "Fills the bounding box of the input with a regular grid of points.",
		minFeatures: 1,
		inputHint: "Any features (defines the extent).",
		params: [
			{ key: "cellSide", label: "Cell side", type: "number", min: 0.1, max: 50, step: 0.1, default: 1 },
			UNITS,
		],
	},
	{
		id: "randomPoints",
		name: "Random Points",
		category: "Advanced",
		description: "Generates random points inside the bounding box of the input.",
		minFeatures: 1,
		inputHint: "Any features (defines the extent).",
		params: [
			{ key: "count", label: "Count", type: "number", min: 1, max: 500, step: 1, default: 50 },
		],
	},
]

export function getOperation(id: string): OperationDef | undefined {
	return OPERATIONS.find((op) => op.id === id)
}

export function defaultParams(op: OperationDef): Params {
	const out: Params = {}
	for (const p of op.params) out[p.key] = p.default
	return out
}
