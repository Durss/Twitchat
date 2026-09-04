import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, "../src_front/utils/PlaceholderModifiers.ts");
const OUTPUT_FILE = path.join(__dirname, "../PLACEHOLDER_MODIFIERS.md");
const INJECT_MARKER = "<!-- INJECT_AFTER -->";

/**
 * Generates the placeholder modifiers documentation from the JSDoc
 * comments of the MODIFIERS map.
 *
 * Everything above the INJECT_AFTER marker of the output file is
 * hand written and preserved, everything below is regenerated.
 */
function main() {
	console.log("Reading " + path.basename(INPUT_FILE) + "...");
	const source = fs.readFileSync(INPUT_FILE, "utf-8");
	const sourceFile = ts.createSourceFile(
		INPUT_FILE,
		source,
		ts.ScriptTarget.Latest,
		true, //setParentNodes, needed to read the JSDoc
	);

	const regions = extractRegions(source);
	const modifiers = extractModifiers(sourceFile, source, regions);
	console.log("Found " + modifiers.length + " modifiers in " + regions.length + " categories");

	const undocumented = modifiers.filter((m) => !m.description && !m.aliasOf);
	if (undocumented.length > 0) {
		throw new Error(
			"These modifiers have no JSDoc comment: " + undocumented.map((m) => m.name).join(", "),
		);
	}

	const markdown = generateMarkdown(modifiers);

	const existing = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, "utf-8") : "";
	const markerIndex = existing.indexOf(INJECT_MARKER);
	if (markerIndex === -1) {
		throw new Error(
			'Could not find the "' +
				INJECT_MARKER +
				'" marker in ' +
				path.basename(OUTPUT_FILE) +
				". The hand written header must be kept in that file.",
		);
	}

	const header = existing.substring(0, markerIndex + INJECT_MARKER.length);
	fs.writeFileSync(OUTPUT_FILE, toCRLF(header + "\n\n" + markdown), "utf-8");
	console.log("Written to " + path.basename(OUTPUT_FILE));
}

/**
 * Reads the "//#region <name>" markers so every modifier can be
 * assigned to a category. Regions aren't AST nodes, hence the raw scan.
 */
function extractRegions(source) {
	const lines = source.split("\n");
	const regions = [];
	let current = null;
	lines.forEach((line, index) => {
		const open = line.match(/^\s*\/\/#region\s+(.+?)\s*$/);
		if (open) {
			current = { name: open[1], start: index + 1, end: Infinity };
			regions.push(current);
			return;
		}
		if (/^\s*\/\/#endregion/.test(line) && current) {
			current.end = index + 1;
			current = null;
		}
	});
	return regions;
}

/**
 * Extracts every entry of the MODIFIERS map along with its JSDoc
 */
function extractModifiers(sourceFile, source, regions) {
	const modifiers = [];

	const visit = (node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === "MODIFIERS" &&
			node.initializer &&
			ts.isObjectLiteralExpression(node.initializer)
		) {
			for (const prop of node.initializer.properties) {
				if (!ts.isPropertyAssignment(prop)) continue;
				const name = prop.name.getText(sourceFile).replace(/^["']|["']$/g, "");
				const line =
					sourceFile.getLineAndCharacterOfPosition(prop.getStart(sourceFile)).line + 1;
				const region = regions.find((r) => line > r.start && line < r.end);
				modifiers.push({
					name,
					category: region ? region.name : "Misc",
					...parseJSDoc(prop, sourceFile),
				});
			}
			return;
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);

	return modifiers;
}

/**
 * Splits a JSDoc block into a description, its params and its examples
 */
function parseJSDoc(node, sourceFile) {
	const res = { description: "", params: [], examples: [], aliasOf: null };
	const docs = node.jsDoc;
	if (!docs || docs.length === 0) return res;

	const doc = docs[docs.length - 1];
	res.description = typeof doc.comment === "string" ? doc.comment.replace(/\s*\n\s*/g, " ") : "";

	for (const tag of doc.tags || []) {
		const tagName = tag.tagName.getText(sourceFile);
		const comment =
			typeof tag.comment === "string" ? tag.comment.replace(/\s*\n\s*/g, " ") : "";

		if (tagName === "param") {
			res.params.push({
				name: tag.name ? tag.name.getText(sourceFile) : "",
				description: comment,
			});
		} else if (tagName === "example") {
			res.examples.push(comment);
		} else if (tagName === "alias") {
			res.aliasOf = comment.trim();
		}
	}
	return res;
}

/**
 * Builds the markdown
 */
function generateMarkdown(modifiers) {
	// fold the aliases into the modifier they point at
	const byName = new Map(modifiers.map((m) => [m.name, m]));
	for (const modifier of modifiers) {
		if (!modifier.aliasOf) continue;
		const target = byName.get(modifier.aliasOf);
		if (!target)
			throw new Error(modifier.name + " aliases unknown modifier " + modifier.aliasOf);
		(target.aliases ??= []).push(modifier.name);
	}
	const documented = modifiers.filter((m) => !m.aliasOf);

	const categories = [];
	for (const modifier of documented) {
		let category = categories.find((c) => c.name === modifier.category);
		if (!category) categories.push((category = { name: modifier.category, entries: [] }));
		category.entries.push(modifier);
	}

	let md = "## Available modifiers\n\n";

	// summary table
	md += "| Modifier | Category | What it does |\n|---|---|---|\n";
	for (const category of categories) {
		for (const entry of category.entries) {
			md +=
				"| [`" +
				entry.name +
				"`](#" +
				anchor(entry.name) +
				") | " +
				category.name +
				" | " +
				firstSentence(entry.description) +
				" |\n";
		}
	}
	md += "\n";

	for (const category of categories) {
		md += "\n## " + category.name + "\n";
		for (const entry of category.entries) {
			md += "\n### " + entry.name + "\n\n";
			if (entry.aliases) {
				md +=
					"_Also available as " +
					entry.aliases.map((a) => "`" + a + "`").join(", ") +
					"._\n\n";
			}
			md += entry.description + "\n";

			if (entry.params.length > 0) {
				md += "\n| Argument | Description |\n|---|---|\n";
				for (const param of entry.params) {
					md += "| `" + param.name + "` | " + param.description + " |\n";
				}
			}

			if (entry.examples.length > 0) {
				md += "\n```\n" + entry.examples.join("\n") + "\n```\n";
			}
		}
	}

	return md;
}

function firstSentence(text) {
	if (!text) return "";
	const match = text.match(/^(.*?\.)(\s|$)/);
	return (match ? match[1] : text).replace(/\|/g, "\\|");
}

function anchor(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * The repo is CRLF (see .editorconfig). Without this every regeneration
 * rewrites all the line endings and shows up as a full file diff.
 */
function toCRLF(text) {
	return text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
}

main();
