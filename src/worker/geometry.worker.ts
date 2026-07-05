import type { FeatureCollection } from "geojson"
import { executeOperation } from "../lib/execute"
import { getOperation } from "../lib/operations"
import type { WorkerRequest, WorkerResponse } from "../types"

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
	const msg = e.data
	try {
		const result = executeOperation(msg.opId, msg.input, msg.params)

		let frames: FeatureCollection[] | undefined
		const op = getOperation(msg.opId)
		if (msg.frames && msg.frames > 1 && op && op.animatableParam) {
			const key = op.animatableParam
			const from = op.animateFrom ?? 0
			const target = Number(msg.params[key] ?? from)
			frames = []
			for (let i = 0; i < msg.frames; i++) {
				const t = i / (msg.frames - 1)
				const v = from + (target - from) * t
				try {
					const frame = executeOperation(msg.opId, msg.input, {
						...msg.params,
						[key]: v,
					})
					frames.push(frame.output)
				} catch {
					frames.push(EMPTY)
				}
			}
			// ensure the final frame is exactly the real result
			frames[frames.length - 1] = result.output
		}

		const res: WorkerResponse = { id: msg.id, ok: true, result, frames }
		;(self as unknown as Worker).postMessage(res)
	} catch (err) {
		const res: WorkerResponse = {
			id: msg.id,
			ok: false,
			error: err instanceof Error ? err.message : String(err),
		}
		;(self as unknown as Worker).postMessage(res)
	}
}
