import type { Params } from "../types"

export type CodeSnippets = {
	turf: string
	shapely: string
	postgis: string
}

const TURF_HEADER =
	'import * as turf from "@turf/turf"\n// input: a GeoJSON FeatureCollection of your drawn features\n\n'
const SHAPELY_HEADER =
	'from shapely.geometry import shape, MultiPoint, box\nfrom shapely.ops import unary_union\n\n# geom / geoms: shapely geometries built with shape(feature["geometry"])\n\n'
const POSTGIS_HEADER =
	'-- assumes a table "features" with a geometry column "geom" (SRID 4326)\n\n'

export function generateCode(opId: string, params: Params): CodeSnippets {
	const num = (k: string, d = 0): number =>
		typeof params[k] === "number" ? (params[k] as number) : Number(params[k] ?? d)
	const str = (k: string, d = ""): string => String(params[k] ?? d)
	const METERS: Record<string, number> = {
		meters: 1,
		kilometers: 1000,
		miles: 1609.34,
	}
	const unit = str("units", "kilometers")
	const toMeters = (v: number): number => Math.round(v * (METERS[unit] ?? 1000))

	const make = (turf_: string, shapely: string, postgis: string): CodeSnippets => ({
		turf: TURF_HEADER + turf_,
		shapely: SHAPELY_HEADER + shapely,
		postgis: POSTGIS_HEADER + postgis,
	})

	switch (opId) {
		case "buffer": {
			const r = num("radius", 10)
			const steps = Math.round(num("steps", 16))
			const m = toMeters(r)
			return make(
				`const result = turf.buffer(input, ${r}, { units: "${unit}", steps: ${steps} })`,
				`# reproject to a metric CRS first for accurate buffers\nresult = geom.buffer(${m}, quad_segs=${steps})`,
				`SELECT ST_Buffer(geom::geography, ${m})::geometry AS result\nFROM features;`,
			)
		}
		case "union":
			return make(
				"const result = turf.union(turf.featureCollection([a, b]))",
				"result = unary_union(geoms)",
				"SELECT ST_Union(geom) AS result FROM features;",
			)
		case "intersect":
			return make(
				"const result = turf.intersect(turf.featureCollection([a, b]))",
				"result = a.intersection(b)",
				"SELECT ST_Intersection(a.geom, b.geom) AS result\nFROM features a, features b\nWHERE a.id = 1 AND b.id = 2;",
			)
		case "difference":
			return make(
				"const result = turf.difference(turf.featureCollection([a, b]))",
				"result = a.difference(b)",
				"SELECT ST_Difference(a.geom, b.geom) AS result\nFROM features a, features b\nWHERE a.id = 1 AND b.id = 2;",
			)
		case "symmetricDifference":
			return make(
				"// Turf has no direct symmetric difference:\nconst u = turf.union(turf.featureCollection([a, b]))\nconst i = turf.intersect(turf.featureCollection([a, b]))\nconst result = i ? turf.difference(turf.featureCollection([u, i])) : u",
				"result = a.symmetric_difference(b)",
				"SELECT ST_SymDifference(a.geom, b.geom) AS result\nFROM features a, features b\nWHERE a.id = 1 AND b.id = 2;",
			)
		case "dissolve":
			return make(
				"const result = turf.dissolve(turf.flatten(input))",
				"result = unary_union(geoms)",
				"SELECT ST_UnaryUnion(ST_Collect(geom)) AS result FROM features;",
			)
		case "clip":
			return make(
				"const bbox = turf.bbox(mask)\nconst result = turf.bboxClip(feature, bbox)",
				"minx, miny, maxx, maxy = mask.bounds\nresult = geom.intersection(box(minx, miny, maxx, maxy))",
				"SELECT ST_ClipByBox2D(geom, ST_Envelope(mask.geom)) AS result\nFROM features, mask;",
			)
		case "combine":
			return make(
				"const result = turf.combine(input)",
				"result = MultiPoint([g for g in geoms])  # or MultiPolygon / MultiLineString",
				"SELECT ST_Collect(geom) AS result FROM features;",
			)
		case "area":
			return make(
				"const squareMeters = turf.area(input)",
				"# reproject to a metric CRS first\nsquare_meters = geom.area",
				"SELECT ST_Area(geom::geography) AS square_meters FROM features;",
			)
		case "length":
			return make(
				`const total = turf.length(input, { units: "${unit}" })`,
				"# reproject to a metric CRS first\nlength_m = geom.length",
				"SELECT ST_Length(geom::geography) AS length_m FROM features;",
			)
		case "perimeter":
			return make(
				`const line = turf.polygonToLine(polygon)\nconst perimeter = turf.length(line, { units: "${unit}" })`,
				"# reproject to a metric CRS first\nperimeter_m = geom.exterior.length",
				"SELECT ST_Perimeter(geom::geography) AS perimeter_m FROM features;",
			)
		case "bearing":
			return make(
				"const degrees = turf.bearing(point1, point2)",
				"import math\ndx = b.x - a.x\ndy = b.y - a.y\ndegrees = math.degrees(math.atan2(dx, dy))  # planar approximation",
				"SELECT degrees(ST_Azimuth(a.geom, b.geom)) AS bearing\nFROM features a, features b\nWHERE a.id = 1 AND b.id = 2;",
			)
		case "distance":
			return make(
				`const d = turf.distance(point1, point2, { units: "${unit}" })`,
				"# reproject to a metric CRS first\ndistance_m = a.distance(b)",
				"SELECT ST_Distance(a.geom::geography, b.geom::geography) AS meters\nFROM features a, features b\nWHERE a.id = 1 AND b.id = 2;",
			)
		case "center":
			return make(
				"const result = turf.center(input)",
				"minx, miny, maxx, maxy = geom.bounds\nresult = ((minx + maxx) / 2, (miny + maxy) / 2)",
				"SELECT ST_Centroid(ST_Envelope(ST_Collect(geom))) AS result FROM features;",
			)
		case "centroid":
			return make(
				"const result = turf.centroid(input)",
				"result = geom.centroid",
				"SELECT ST_Centroid(ST_Collect(geom)) AS result FROM features;",
			)
		case "bbox":
			return make(
				"const bbox = turf.bbox(input)\nconst result = turf.bboxPolygon(bbox)",
				"result = box(*geom.bounds)",
				"SELECT ST_Envelope(ST_Collect(geom)) AS result FROM features;",
			)
		case "envelope":
			return make(
				"const result = turf.envelope(input)",
				"result = box(*unary_union(geoms).bounds)",
				"SELECT ST_Envelope(ST_Collect(geom)) AS result FROM features;",
			)
		case "rotate": {
			const a = num("angle", 45)
			return make(
				`const result = turf.transformRotate(input, ${a})`,
				`from shapely import affinity\n# shapely rotates counter-clockwise; turf rotates clockwise\nresult = affinity.rotate(geom, ${-a}, origin="centroid")`,
				`SELECT ST_Rotate(geom, radians(${-a}), ST_Centroid(geom)) AS result\nFROM features;`,
			)
		}
		case "scale": {
			const f = num("factor", 1.5)
			return make(
				`const result = turf.transformScale(input, ${f}, { origin: "centroid" })`,
				`from shapely import affinity\nresult = affinity.scale(geom, xfact=${f}, yfact=${f}, origin="centroid")`,
				`-- scale around the centroid\nSELECT ST_Translate(\n  ST_Scale(ST_Translate(geom, -ST_X(c), -ST_Y(c)), ${f}, ${f}),\n  ST_X(c), ST_Y(c)\n) AS result\nFROM features, LATERAL ST_Centroid(geom) AS c;`,
			)
		}
		case "translate": {
			const d = num("distance", 50)
			const dir = num("direction", 45)
			return make(
				`const result = turf.transformTranslate(input, ${d}, ${dir}, { units: "${unit}" })`,
				`from shapely import affinity\nimport math\nd = ${toMeters(d)}  # meters (use a metric CRS)\nrad = math.radians(90 - ${dir})\nresult = affinity.translate(geom, d * math.cos(rad), d * math.sin(rad))`,
				`SELECT ST_Translate(geom, ${toMeters(d)} * sin(radians(${dir})), ${toMeters(d)} * cos(radians(${dir}))) AS result\nFROM features;  -- in a metric CRS`,
			)
		}
		case "flip":
			return make(
				"const result = turf.flip(input)",
				"from shapely.ops import transform\nresult = transform(lambda x, y: (y, x), geom)",
				"SELECT ST_FlipCoordinates(geom) AS result FROM features;",
			)
		case "simplify": {
			const t = num("tolerance", 0.02)
			const hq = params["highQuality"] ? "true" : "false"
			return make(
				`const result = turf.simplify(input, { tolerance: ${t}, highQuality: ${hq} })`,
				`result = geom.simplify(${t}, preserve_topology=True)`,
				`SELECT ST_SimplifyPreserveTopology(geom, ${t}) AS result FROM features;`,
			)
		}
		case "smooth": {
			const res = Math.round(num("resolution", 10000))
			const sh = num("sharpness", 0.85)
			return make(
				`const result = turf.bezierSpline(line, { resolution: ${res}, sharpness: ${sh} })`,
				"# no built-in spline smoothing in shapely;\n# see scipy.interpolate or shapely.segmentize + simplify",
				"SELECT ST_ChaikinSmoothing(geom, 3) AS result FROM features;",
			)
		}
		case "clean":
			return make(
				"const result = turf.cleanCoords(feature)",
				"result = geom.simplify(0)  # drops collinear/duplicate points",
				"SELECT ST_RemoveRepeatedPoints(geom) AS result FROM features;",
			)
		case "truncate": {
			const prec = Math.round(num("precision", 4))
			return make(
				`const result = turf.truncate(input, { precision: ${prec} })`,
				`import shapely\nresult = shapely.set_precision(geom, ${Math.pow(10, -prec)})`,
				`SELECT ST_SnapToGrid(geom, ${Math.pow(10, -prec)}) AS result FROM features;`,
			)
		}
		case "voronoi":
			return make(
				"const result = turf.voronoi(points, { bbox })",
				"from shapely.ops import voronoi_diagram\nresult = voronoi_diagram(MultiPoint(points))",
				"SELECT (ST_Dump(ST_VoronoiPolygons(ST_Collect(geom)))).geom AS result\nFROM features;",
			)
		case "tin":
			return make(
				"const result = turf.tin(points)",
				"from shapely.ops import triangulate\nresult = triangulate(MultiPoint(points))",
				"SELECT (ST_Dump(ST_DelaunayTriangles(ST_Collect(geom)))).geom AS result\nFROM features;",
			)
		case "convex":
			return make(
				"const result = turf.convex(input)",
				"result = unary_union(geoms).convex_hull",
				"SELECT ST_ConvexHull(ST_Collect(geom)) AS result FROM features;",
			)
		case "concave": {
			const me = num("maxEdge", 100)
			return make(
				`const result = turf.concave(points, { maxEdge: ${me}, units: "kilometers" })`,
				"import shapely\nresult = shapely.concave_hull(MultiPoint(points), ratio=0.5)",
				"SELECT ST_ConcaveHull(ST_Collect(geom), 0.5) AS result FROM features;",
			)
		}
		case "hexGrid": {
			const c = num("cellSide", 1)
			return make(
				`const result = turf.hexGrid(turf.bbox(input), ${c}, { units: "${unit}" })`,
				"# no built-in grid in shapely; iterate rows/cols and build Polygons",
				`SELECT (ST_HexagonGrid(${toMeters(c)}, ST_Collect(geom))).geom AS result\nFROM features;  -- in a metric CRS`,
			)
		}
		case "squareGrid": {
			const c = num("cellSide", 1)
			return make(
				`const result = turf.squareGrid(turf.bbox(input), ${c}, { units: "${unit}" })`,
				"# no built-in grid in shapely; iterate rows/cols and build box() cells",
				`SELECT (ST_SquareGrid(${toMeters(c)}, ST_Collect(geom))).geom AS result\nFROM features;  -- in a metric CRS`,
			)
		}
		case "triangleGrid": {
			const c = num("cellSide", 1)
			return make(
				`const result = turf.triangleGrid(turf.bbox(input), ${c}, { units: "${unit}" })`,
				"# build a square grid and split each cell into two triangles",
				"-- no built-in triangle grid; start from ST_SquareGrid and split cells",
			)
		}
		case "pointGrid": {
			const c = num("cellSide", 1)
			return make(
				`const result = turf.pointGrid(turf.bbox(input), ${c}, { units: "${unit}" })`,
				"# iterate rows/cols with numpy.arange and build Points",
				"-- generate with generate_series() over the extent in a metric CRS",
			)
		}
		case "randomPoints": {
			const n = Math.round(num("count", 50))
			return make(
				`const result = turf.randomPoint(${n}, { bbox: turf.bbox(input) })`,
				`import random\nminx, miny, maxx, maxy = geom.bounds\npoints = [\n    (random.uniform(minx, maxx), random.uniform(miny, maxy))\n    for _ in range(${n})\n]`,
				`SELECT ST_GeneratePoints(ST_ConvexHull(ST_Collect(geom)), ${n}) AS result\nFROM features;`,
			)
		}
		default:
			return make(
				`// no code template for "${opId}" yet`,
				`# no code template for "${opId}" yet`,
				`-- no code template for "${opId}" yet`,
			)
	}
}
