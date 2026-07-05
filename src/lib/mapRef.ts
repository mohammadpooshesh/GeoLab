import type maplibregl from "maplibre-gl"
import type MapboxDraw from "@mapbox/mapbox-gl-draw"

/**
 * Module-level handles to the MapLibre map and the Draw control so that
 * toolbar actions and exports can reach them without prop drilling.
 */
export const mapRef: {
	map: maplibregl.Map | null
	draw: MapboxDraw | null
} = {
	map: null,
	draw: null,
}
