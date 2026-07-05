import { useEffect } from "react"
import { getOperation } from "../lib/operations"
import { useStore } from "../store"

export default function Timeline() {
	const activeOpId = useStore((s) => s.activeOpId)
	const frames = useStore((s) => s.frames)
	const timelineT = useStore((s) => s.timelineT)
	const playing = useStore((s) => s.playing)
	const params = useStore((s) => s.params)
	const setTimelineT = useStore((s) => s.setTimelineT)
	const setPlaying = useStore((s) => s.setPlaying)
	const op = activeOpId ? getOperation(activeOpId) : undefined

	// Playback loop: ~30fps, stops at the end
	useEffect(() => {
		if (!playing) return
		const id = window.setInterval(() => {
			const s = useStore.getState()
			const next = s.timelineT + 0.02
			if (next >= 1) {
				s.setTimelineT(1)
				s.setPlaying(false)
			} else {
				s.setTimelineT(next)
			}
		}, 33)
		return () => window.clearInterval(id)
	}, [playing])

	const onPlay = () => {
		const s = useStore.getState()
		if (!playing && s.timelineT >= 1) s.setTimelineT(0)
		setPlaying(!playing)
	}

	let readout = ""
	if (op && op.animatableParam) {
		const from = op.animateFrom ?? 0
		const target = Number(params[op.animatableParam] ?? from)
		const v = from + (target - from) * timelineT
		readout = op.animatableParam + " = " + v.toFixed(2)
	}

	return (
		<footer className="timeline">
			<button className="play" onClick={onPlay} disabled={!op}>
				{playing ? "❚❚ Pause" : "▶ Play"}
			</button>
			<div className="timeline-body">
				<div className="timeline-labels">
					<span>Input</span>
					<span>{op ? op.name : "—"}</span>
					<span>Result</span>
				</div>
				<input
					type="range"
					min={0}
					max={100}
					value={Math.round(timelineT * 100)}
					onChange={(e) => setTimelineT(Number(e.target.value) / 100)}
					disabled={!op}
				/>
			</div>
			<div className="timeline-readout">
				{op
					? frames
						? readout
						: "Opacity fade — this operation has no animatable parameter"
					: "Pick an operation to animate it step by step"}
			</div>
		</footer>
	)
}
