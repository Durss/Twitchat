#!/usr/bin/env node

/**
 * Vue Class-to-Composition API Migration Tracker
 *
 * Scans all .vue files under src_front/ and classifies each as:
 *   - "class"       → uses vue-facing-decorator / @Component / extends Vue
 *   - "composition"  → uses <script setup> (preferred target)
 *   - "options"      → defineComponent without setup sugar (or plain <script> with no class pattern)
 *
 * Usage:
 *   node scripts/trackMigration.mjs [--json] [--by-dir] [--list-class] [--verbose] [--update-readme]
 *
 * Flags:
 *   --json           Output raw JSON instead of tables
 *   --by-dir         Show per-directory breakdown
 *   --list-class     List every class-style component path
 *   --verbose        Show all three lists (class / composition / options)
 *   --update-readme  Update the migration stats section in README.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, dirname, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src_front");

// ── Patterns ────────────────────────────────────────────────────────────
const CLASS_PATTERNS = [
	/from\s+["']vue-facing-decorator["']/,
	/@Component\s*\(/,
	/class\s+\w+\s+extends\s+(Vue|mixins)\b/,
	/from\s+["']vue-class-component["']/,
	/from\s+["']vue-property-decorator["']/,
];

const COMPOSITION_SETUP_PATTERN = /<script\s[^>]*setup[^>]*>/i;
const DEFINE_COMPONENT_PATTERN = /defineComponent\s*\(/;

// ── Helpers ─────────────────────────────────────────────────────────────
function walk(dir) {
	const results = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			results.push(...walk(full));
		} else if (entry.endsWith(".vue")) {
			results.push(full);
		}
	}
	return results;
}

function classify(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");
	const lineCount = lines.length;

	// Detect class-style
	const isClass = CLASS_PATTERNS.some((re) => re.test(content));
	if (isClass) {
		// Collect decorator details for richer reports
		const decorators = [];
		if (/@Prop[\s(]/.test(content)) decorators.push("@Prop");
		if (/@Watch[\s(]/.test(content)) decorators.push("@Watch");
		if (/@Emit[\s(]/.test(content)) decorators.push("@Emit");
		if (/@Ref[\s(]/.test(content)) decorators.push("@Ref");
		return { style: "class", lineCount, decorators };
	}

	// Detect <script setup>
	if (COMPOSITION_SETUP_PATTERN.test(content)) {
		return { style: "composition", lineCount, decorators: [] };
	}

	// Detect defineComponent (Options-like wrapper without setup sugar)
	if (DEFINE_COMPONENT_PATTERN.test(content)) {
		return { style: "options", lineCount, decorators: [] };
	}

	// Fallback: plain <script> with no recognisable pattern
	return { style: "options", lineCount, decorators: [] };
}

// ── Main ────────────────────────────────────────────────────────────────
const flags = new Set(process.argv.slice(2).map((a) => a.toLowerCase()));

const files = walk(SRC);
const results = files.map((f) => {
	const info = classify(f);
	return {
		path: relative(ROOT, f).replaceAll(sep, "/"),
		dir: dirname(relative(SRC, f)).replaceAll(sep, "/"),
		...info,
	};
});

const classFiles = results.filter((r) => r.style === "class");
const compositionFiles = results.filter((r) => r.style === "composition");
const optionsFiles = results.filter((r) => r.style === "options");

const total = results.length;
const pct = (n) => ((n / total) * 100).toFixed(1);

// ── JSON output ─────────────────────────────────────────────────────────
if (flags.has("--json")) {
	const output = {
		summary: {
			total,
			class: classFiles.length,
			composition: compositionFiles.length,
			options: optionsFiles.length,
			migrationProgress: `${pct(compositionFiles.length)}%`,
		},
		classComponents: classFiles.map((r) => ({
			path: r.path,
			lines: r.lineCount,
			decorators: r.decorators,
		})),
	};
	if (flags.has("--by-dir")) {
		output.byDirectory = buildDirBreakdown();
	}
	console.log(JSON.stringify(output, null, 2));
	process.exit(0);
}

// ── Human-readable output ───────────────────────────────────────────────
const BAR_WIDTH = 40;
function bar(n, total) {
	const filled = Math.round((n / total) * BAR_WIDTH);
	return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

// ── Verbose: all lists ──────────────────────────────────────────────────
if (flags.has("--verbose")) {
	for (const [label, list] of [
		["Class-style", classFiles],
		["Composition API", compositionFiles],
		["Options API / other", optionsFiles],
	]) {
		console.log(`  ${label} (${list.length}):`);
		for (const r of list.sort((a, b) => a.path.localeCompare(b.path))) {
			console.log(`    ${r.path}`);
		}
		console.log("");
	}
}

// ── List class components ───────────────────────────────────────────────
if (flags.has("--list-class")) {
	console.log("  Class-style components to migrate:");
	console.log("  " + "─".repeat(74));

	// Sort by line count descending (biggest first = most effort)
	const sorted = [...classFiles].sort((a, b) => b.lineCount - a.lineCount);
	for (const r of sorted) {
		const decs = r.decorators.length > 0 ? `  [${r.decorators.join(", ")}]` : "";
		console.log(`    ${String(r.lineCount).padStart(5)} lines  ${r.path}${decs}`);
	}
	console.log("  " + "─".repeat(74));
	console.log(`  Total class-style lines: ${classFiles.reduce((s, r) => s + r.lineCount, 0)}`);
	console.log("");
}

// ── Per-directory breakdown ─────────────────────────────────────────────
if (flags.has("--by-dir")) {
	console.log("  Per-directory breakdown:");
	console.log("  " + "─".repeat(74));
	console.log(
		"  " +
			"Directory".padEnd(42) +
			"Class".padStart(6) +
			"Comp".padStart(6) +
			"Opts".padStart(6) +
			"Total".padStart(7) +
			"  Done",
	);
	console.log("  " + "─".repeat(74));

	const dirData = buildDirBreakdown();
	const sortedDirs = Object.keys(dirData).sort();
	for (const dir of sortedDirs) {
		const d = dirData[dir];
		const donePct = ((d.composition / d.total) * 100).toFixed(0);
		const displayDir = dir.length > 40 ? "…" + dir.slice(-39) : dir;
		console.log(
			"  " +
				displayDir.padEnd(42) +
				String(d.class).padStart(6) +
				String(d.composition).padStart(6) +
				String(d.options).padStart(6) +
				String(d.total).padStart(7) +
				`  ${donePct}%`.padStart(6),
		);
	}
	console.log("  " + "─".repeat(74));
	console.log("");
}

// ── Summary (printed last so it's visible at the bottom) ────────────────
console.log("");
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║        Vue Class → Composition API Migration Tracker       ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log("");

console.log(`  Total .vue files:  ${total}`);
console.log("");
console.log(
	`  ✅ Composition API (<script setup>):  ${compositionFiles.length}  (${pct(compositionFiles.length)}%)`,
);
console.log(
	`  ⚠️  Class-style (vue-facing-decorator): ${classFiles.length}  (${pct(classFiles.length)}%)`,
);
if (optionsFiles.length > 0) {
	console.log(
		`  📦 Options API / other:                ${optionsFiles.length}  (${pct(optionsFiles.length)}%)`,
	);
}
console.log("");
console.log(`  Migration progress:`);
console.log(`  ${bar(compositionFiles.length, total)}  ${pct(compositionFiles.length)}%`);
console.log("");

// Decorator usage summary
const decoratorCounts = {};
for (const r of classFiles) {
	for (const d of r.decorators) {
		decoratorCounts[d] = (decoratorCounts[d] || 0) + 1;
	}
}
if (Object.keys(decoratorCounts).length > 0) {
	console.log("  Decorator usage in class components:");
	for (const [dec, count] of Object.entries(decoratorCounts).sort((a, b) => b[1] - a[1])) {
		console.log(`    ${dec.padEnd(10)} ${count} file(s)`);
	}
	console.log("");
}

// ── Helpers ─────────────────────────────────────────────────────────────
function buildDirBreakdown() {
	const dirs = {};
	for (const r of results) {
		if (!dirs[r.dir]) dirs[r.dir] = { class: 0, composition: 0, options: 0, total: 0 };
		dirs[r.dir][r.style]++;
		dirs[r.dir].total++;
	}
	return dirs;
}

// ── Update README.md ────────────────────────────────────────────────────
if (flags.has("--update-readme")) {
	const readmePath = join(ROOT, "README.md");
	const readme = readFileSync(readmePath, "utf-8");

	const startMarker = "<!-- MIGRATION-STATS-START -->";
	const endMarker = "<!-- MIGRATION-STATS-END -->";

	const startIdx = readme.indexOf(startMarker);
	const endIdx = readme.indexOf(endMarker);

	if (startIdx === -1 || endIdx === -1) {
		console.error("  ❌  Could not find migration stats markers in README.md");
		process.exit(1);
	}

	const compositionPct = pct(compositionFiles.length);
	const classPct = pct(classFiles.length);

	const barLen = 30;
	const filled = Math.round((compositionFiles.length / total) * barLen);

	const statsBlock = [
		startMarker,
		"",
		`| | Count | % |`,
		`|---|---|---|`,
		`| Composition API (\`<script setup>\`) | **${compositionFiles.length}** | ${compositionPct}% |`,
		`| Class-style (vue-facing-decorator) | **${classFiles.length}** | ${classPct}% |`,
		...(optionsFiles.length > 0
			? [
					`| Options API / other | **${optionsFiles.length}** | ${pct(optionsFiles.length)}% |`,
				]
			: []),
		`| **Total** | **${total}** | |`,
		"",
		`> Migration progress \`[${"⣿".repeat(filled)}${"⣀".repeat(barLen - filled)}]\` _(${compositionPct}%)_`,
		"",
		`_Last updated: ${new Date().toISOString().split("T")[0]}_`,
		"",
	].join("\n");

	const updated = readme.slice(0, startIdx) + statsBlock + readme.slice(endIdx);
	writeFileSync(readmePath, updated, "utf-8");
	console.log("  ✅  README.md migration stats updated");
}
