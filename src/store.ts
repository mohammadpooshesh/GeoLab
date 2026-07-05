import { create } from "zustand"
import type { FeatureCollection } from "geojson"
import type { OpResult, Params, ThemeMode } from "./types"
import { defaultParams, getOperation } from "./lib/operations"

export const EMPTY_FC: FeatureCollection = {
	type: "FeatureCollection",
	features: [],
}

const HISTORY_CAP = 50

type GeoLabState = {
	theme: ThemeMode
	/** Features drawn on the map (the operation input) */
	drawn: FeatureCollection
	/** True when the last change came from the draw control (skip syncing back) */
	drawnFromMap: boolean
	past: FeatureCollection[]
	future: FeatureCollection[]
	selected: FeatureCollection
	activeOpId: string | null
	params: Params
	result: OpResult | null
	frames: FeatureCollection[] | null
	/** Timeline position from 0 (input) to 1 (final result) */
	timelineT: number
	playing: boolean
	busy: boolean
	error: string | null
	showInput: boolean
	showOutput: boolean
	toggleTheme: () => void
	setDrawn: (fc: FeatureCollection, fromMap: boolean) => void
	undo: () => void
	redo: () => void
	setSelected: (fc: FeatureCollection) => void
	setActiveOp: (id: string | null) => void
	setParam: (key: string, value: number | string | boolean) => void
	setResult: (
		result: OpResult | null,
		frames: FeatureCollection[] | null,
	) => void
	setTimelineT: (t: number) => void
	setPlaying: (p: boolean) => void
	setBusy: (b: boolean) => void
	setError: (e: string | null) => void
	toggleShowInput: () => void
	toggleShowOutput: () => void
}

export const useStore = create<GeoLabState>((set, get) => ({
	theme: "dark",
	drawn: EMPTY_FC,
	drawnFromMap: false,
	past: [],
	future: [],
	selected: EMPTY_FC,
	activeOpId: null,
	params: {},
	result: null,
	frames: null,
	timelineT: 1,
	playing: false,
	busy: false,
	error: null,
	showInput: true,
	showOutput: true,

	toggleTheme: () =>
		set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

	setDrawn: (fc, fromMap) =>
		set((s) => ({
			drawn: fc,
			drawnFromMap: fromMap,
			past: [...s.past.slice(-(HISTORY_CAP - 1)), s.drawn],
			future: [],
		})),

	undo: () => {
		const s = get()
		if (s.past.length === 0) return
		const prev = s.past[s.past.length - 1]
		set({
			drawn: prev,
			drawnFromMap: false,
			past: s.past.slice(0, -1),
			future: [s.drawn, ...s.future],
		})
	},

	redo: () => {
		const s = get()
		if (s.future.length === 0) return
		const next = s.future[0]
		set({
			drawn: next,
			drawnFromMap: false,
			past: [...s.past, s.drawn],
			future: s.future.slice(1),
		})
	},

	setSelected: (fc) => set({ selected: fc }),

	setActiveOp: (id) => {
		const op = id ? getOperation(id) : undefined
		set({
			activeOpId: id,
			params: op ? defaultParams(op) : {},
			result: null,
			frames: null,
			timelineT: 1,
			playing: false,
			error: null,
		})
	},

	setParam: (key, value) =>
		set((s) => ({ params: { ...s.params, [key]: value } })),

	setResult: (result, frames) => set({ result, frames }),

	setTimelineT: (t) => set({ timelineT: Math.min(Math.max(t, 0), 1) }),

	setPlaying: (p) => set({ playing: p }),

	setBusy: (b) => set({ busy: b }),

	setError: (e) => set({ error: e }),

	toggleShowInput: () => set((s) => ({ showInput: !s.showInput })),

	toggleShowOutput: () => set((s) => ({ showOutput: !s.showOutput })),
}))
