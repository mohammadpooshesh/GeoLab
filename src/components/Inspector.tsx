import { useMemo, useState } from "react"
import { generateCode } from "../lib/codegen"
import { describeFeature } from "../lib/geo"
import { getOperation } from "../lib/operations"
import { useStore } from "../store"

const TABS = ["turf", "shapely", "postgis"] as const
type Tab = (typeof TABS)[number]
const TAB_LABELS: Record<Tab, string> = {
	turf: "Turf.js",
	shapely: "Shapely",
	postgis: "PostGIS",
}

function ParamsPanel() {
	const activeOpId = useStore((s) => s.activeOpId)
	const params = useStore((s) => s.params)
	const setParam = useStore((s) => s.setParam)
	const op = activeOpId ? getOperation(activeOpId) : undefined
	if (!op || op.params.length === 0) return null

	return (
		<div className="params">
			{op.params.map((p) => {
				if (p.type === "number") {
					const v = Number(params[p.key] ?? p.default)
					return (
						<label key={p.key} className="param">
							<span className="param-label">
								{p.label}
								<span className="param-value">{v}</span>
							</span>
							<input
								type="range"
								min={p.min}
								max={p.max}
								step={p.step}
								value={v}
								onChange={(e) => setParam(p.key, Number(e.target.value))}
							/>
						</label>
					)
				}
				if (p.type === "select") {
					return (
						<label key={p.key} className="param">
							<span className="param-label">{p.label}</span>
							<select
								value={String(params[p.key] ?? p.default)}
								onChange={(e) => setParam(p.key, e.target.value)}
							>
								{(p.options || []).map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</label>
					)
				}
				return (
					<label key={p.key} className="param param-check">
						<input
							type="checkbox"
							checked={Boolean(params[p.key] ?? p.default)}
							onChange={(e) => setParam(p.key, e.target.checked)}
						/>
						<span>{p.label}</span>
					</label>
				)
			})}
		</div>
	)
}

function CodePanel() {
	const activeOpId = useStore((s) => s.activeOpId)
	const params = useStore((s) => s.params)
	const [tab, setTab] = useState<Tab>("turf")
	const [copied, setCopied] = useState(false)
	const code = useMemo(
		() => (activeOpId ? generateCode(activeOpId, params) : null),
		[activeOpId, params],
	)
	if (!code) return null
	const text = code[tab]

	const copy = () => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true)
			window.setTimeout(() => setCopied(false), 1200)
		})
	}

	return (
		<div className="card">
			<div className="card-title">Code</div>
			<div className="code-tabs">
				{TABS.map((t) => (
					<button
						key={t}
						className={t === tab ? "tab active" : "tab"}
						onClick={() => setTab(t)}
					>
						{TAB_LABELS[t]}
					</button>
				))}
				<button className="copy" onClick={copy}>
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>
			<pre className="code">{text}</pre>
		</div>
	)
}

export default function Inspector() {
	const activeOpId = useStore((s) => s.activeOpId)
	const result = useStore((s) => s.result)
	const selected = useStore((s) => s.selected)
	const error = useStore((s) => s.error)
	const op = activeOpId ? getOperation(activeOpId) : undefined

	const selectedStats = useMemo(
		() =>
			selected.features.length === 1
				? describeFeature(selected.features[0])
				: [],
		[selected],
	)

	return (
		<aside className="inspector">
			<div className="panel-title">Inspector</div>

			{op ? (
				<div className="card">
					<div className="card-title">{op.name}</div>
					<p className="card-desc">{op.description}</p>
					<ParamsPanel />
					<p className="hint">{op.inputHint}</p>
					{error && <p className="error">{error}</p>}
				</div>
			) : (
				<div className="card">
					<p className="card-desc">
						Select an operation to see its parameters, explanation, and
						equivalent code.
					</p>
				</div>
			)}

			{result && result.measurements && result.measurements.length > 0 && (
				<div className="card">
					<div className="card-title">Measurements</div>
					<table className="stats">
						<tbody>
							{result.measurements.map((m) => (
								<tr key={m.label}>
									<td>{m.label}</td>
									<td className="stat-value">{m.value}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{selectedStats.length > 0 && (
				<div className="card">
					<div className="card-title">Selection</div>
					<table className="stats">
						<tbody>
							{selectedStats.map((m) => (
								<tr key={m.label}>
									<td>{m.label}</td>
									<td className="stat-value">{m.value}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{result && result.output.features.length > 0 && (
				<div className="card">
					<div className="card-title">Result</div>
					<p className="card-desc">
						{result.output.features.length} feature(s)
					</p>
					<details>
						<summary>GeoJSON preview</summary>
						<pre className="code small">
							{JSON.stringify(result.output, null, 2).slice(0, 4000)}
						</pre>
					</details>
				</div>
			)}

			<CodePanel />
		</aside>
	)
}
