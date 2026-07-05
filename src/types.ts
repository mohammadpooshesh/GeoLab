import type { FeatureCollection } from "geojson"

export type ThemeMode = "dark" | "light"

export type OpCategory = "Geometry" | "Measurement" | "Transform" | "Advanced"

export type ParamOption = {
	value: string
	label: string
}

export type ParamDef = {
	key: string
	label: string
	type: "number" | "select" | "boolean"
	min?: number
	max?: number
	step?: number
	default: number | string | boolean
	options?: ParamOption[]
}

export type OperationDef = {
	id: string
	name: string
	category: OpCategory
	description: string
	/** Minimum number of input features required */
	minFeatures: number
	/** Human hint about expected input */
	inputHint: string
	params: ParamDef[]
	/** Numeric param that can be animated from animateFrom up to its value */
	animatableParam?: string
	animateFrom?: number
}

export type Params = Record<string, number | string | boolean>

export type Measurement = {
	label: string
	value: string
}

export type OpResult = {
	/** Features to render on the map (may be empty for pure measurements) */
	output: FeatureCollection
	/** Scalar measurements to show in the inspector */
	measurements?: Measurement[]
}

export type WorkerRequest = {
	id: number
	opId: string
	input: FeatureCollection
	params: Params
	/** When set, also compute N animation frames by scaling the animatable param */
	frames?: number
}

export type WorkerResponse =
	| { id: number; ok: true; result: OpResult; frames?: FeatureCollection[] }
	| { id: number; ok: false; error: string }
