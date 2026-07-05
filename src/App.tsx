import { useEffect } from "react"
import Toolbar from "./components/Toolbar"
import OperationsPanel from "./components/OperationsPanel"
import MapCanvas from "./components/MapCanvas"
import Inspector from "./components/Inspector"
import Timeline from "./components/Timeline"
import { useStore } from "./store"
import { getOperation } from "./lib/operations"
import { runOperation } from "./lib/workerClient"

const FRAME_COUNT = 24
const DEBOUNCE_MS = 120

export default function App() {
	const theme = useStore((s) => s.theme)
	const drawn = useStore((s) => s.drawn)
	const activeOpId = useStore((s) => s.activeOpId)
	const params = useStore((s) => s.params)

	useEffect(() => {
		document.documentElement.dataset.theme = theme
	}, [theme])

	// Live preview: recompute whenever the input, operation, or params change.
	useEffect(() => {
		const st = useStore.getState()
		if (!activeOpId) {
			st.setResult(null, null)
			st.setError(null)
			return
		}
		const op = getOperation(activeOpId)
		if (!op) return
		if (drawn.features.length < op.minFeatures) {
			st.setResult(null, null)
			st.setError(
				`Needs at least ${op.minFeatures} feature(s). ${op.inputHint}`,
			)
			return
		}

		let cancelled = false
		st.setError(null)
		const timer = window.setTimeout(() => {
			useStore.getState().setBusy(true)
			runOperation(
				activeOpId,
				drawn,
				params,
				op.animatableParam ? FRAME_COUNT : undefined,
			)
				.then((out) => {
					if (cancelled) return
					const s2 = useStore.getState()
					s2.setResult(out.result, out.frames ?? null)
					s2.setError(null)
				})
				.catch((err: Error) => {
					if (cancelled) return
					const s2 = useStore.getState()
					s2.setResult(null, null)
					s2.setError(err.message)
				})
				.finally(() => {
					if (!cancelled) useStore.getState().setBusy(false)
				})
		}, DEBOUNCE_MS)

		return () => {
			cancelled = true
			window.clearTimeout(timer)
		}
	}, [drawn, activeOpId, params])

	return (
		<div className="app">
			<Toolbar />
			<OperationsPanel />
			<MapCanvas />
			<Inspector />
			<Timeline />
		</div>
	)
}
