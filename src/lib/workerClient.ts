import type { FeatureCollection } from "geojson"
import type { OpResult, Params, WorkerRequest, WorkerResponse } from "../types"

export type RunOutput = {
	result: OpResult
	frames?: FeatureCollection[]
}

type Pending = {
	resolve: (v: RunOutput) => void
	reject: (e: Error) => void
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, Pending>()

function getWorker(): Worker {
	if (worker) return worker
	worker = new Worker(
		new URL("../worker/geometry.worker.ts", import.meta.url),
		{ type: "module" },
	)
	worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
		const msg = e.data
		const p = pending.get(msg.id)
		if (!p) return
		pending.delete(msg.id)
		if (msg.ok) p.resolve({ result: msg.result, frames: msg.frames })
		else p.reject(new Error(msg.error))
	}
	worker.onerror = (e) => {
		const err = new Error(e.message || "Geometry worker crashed")
		for (const p of pending.values()) p.reject(err)
		pending.clear()
		worker?.terminate()
		worker = null
	}
	return worker
}

/** Runs an operation off the main thread; optionally computes animation frames. */
export function runOperation(
	opId: string,
	input: FeatureCollection,
	params: Params,
	frames?: number,
): Promise<RunOutput> {
	const id = ++seq
	const req: WorkerRequest = { id, opId, input, params, frames }
	return new Promise<RunOutput>((resolve, reject) => {
		pending.set(id, { resolve, reject })
		getWorker().postMessage(req)
	})
}
