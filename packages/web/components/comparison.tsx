import styles from "./comparison.module.css";

const comparisons = [
	{
		icon: "\u{1F9F9}",
		unlike: "Unlike linters (ESLint, Biome)",
		description:
			"skills-check validates knowledge accuracy, not code syntax. It detects when a skill references React 18 patterns while React 19 is current, or when a recommended API has been deprecated.",
	},
	{
		icon: "\u{1F6E1}",
		unlike: "Unlike security scanners (Snyk, Socket)",
		description:
			"skills-check detects hallucinated packages and skill-specific injection patterns. It verifies that every package referenced in a skill actually exists on npm, PyPI, or crates.io.",
	},
	{
		icon: "\u{1F4D6}",
		unlike: "Unlike documentation tools",
		description:
			"skills-check treats SKILL.md files as executable instructions and validates them accordingly \u2014 measuring token cost, enforcing organizational policy, and running eval test suites for regression detection.",
	},
];

export function Comparison() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<h2 className={styles.heading}>How it compares</h2>
				<p className={styles.subtitle}>
					skills-check fills a gap that existing tools weren&rsquo;t designed for.
				</p>
				<div className={styles.items}>
					{comparisons.map((item) => (
						<div className={styles.item} key={item.unlike}>
							<span className={styles.icon}>{item.icon}</span>
							<div className={styles.itemContent}>
								<div className={styles.unlike}>{item.unlike}</div>
								<p className={styles.itemDescription}>{item.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
