import { CATEGORIES, OPERATIONS } from "../lib/operations"
import { useStore } from "../store"

export default function OperationsPanel() {
	const activeOpId = useStore((s) => s.activeOpId)
	const setActiveOp = useStore((s) => s.setActiveOp)

	return (
		<aside className="ops">
			<div className="panel-title">Operations</div>
			{CATEGORIES.map((cat) => (
				<details key={cat} open className="ops-group">
					<summary>{cat}</summary>
					<div className="ops-list">
						{OPERATIONS.filter((op) => op.category === cat).map((op) => (
							<button
								key={op.id}
								className={
									op.id === activeOpId ? "ops-item active" : "ops-item"
								}
								onClick={() =>
									setActiveOp(op.id === activeOpId ? null : op.id)
								}
								title={op.description}
							>
								{op.name}
							</button>
						))}
					</div>
				</details>
			))}
		</aside>
	)
}
