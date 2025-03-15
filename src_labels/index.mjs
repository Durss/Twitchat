/**
 * This process takes all the JSON files within the "i18n" folder,
 * compiles them all together and output the static/labels.json file
 */
import * as fs from "fs";
import * as path from "path";
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const credentialsPath = path.join("data", "credentials", "credentials.json");
const credentials = fs.existsSync(credentialsPath)? JSON.parse(fs.readFileSync(credentialsPath, "utf8")) : null;

console.log("\x1b[36m \n Compiling all label files into one... \x1b[0m");

// Recursively get all JSON files from a directory
function getLabelFilesFrom(dir) {
	return fs.readdirSync(dir)
		.filter(f => f !== "." && f !== "..")
		.flatMap(f => {
			const filePath = path.join(dir, f);
			return fs.lstatSync(filePath).isDirectory()
				? getLabelFilesFrom(filePath)
				: /\.json$/i.test(filePath) ? [filePath] : [];
		});
}

// Main processing function
async function processLabels() {
	const rootDir = path.join(__dirname, "../i18n/");
	const files = getLabelFilesFrom(rootDir);
	const output = {};

	// Process each JSON file
	files.forEach(filePath => {
		// Extract path information
		const relativePath = filePath.replace(rootDir, "");
		const pathParts = relativePath.split(path.sep);
		const lang = pathParts[0];

		// Load and parse the JSON file
		let json;
		try {
			json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
		} catch(error) {
			console.log("\x1b[41m Invalid JSON ", filePath, "\x1b[0m");
			return; // Continue to next iteration
		}

		// Initialize structure for this language if needed
		if (!output[lang]) output[lang] = {};

		// Simply copy all keys from the JSON file to the output
		for (const k in json) {
			output[lang][k] = json[k];
		}
	});

	// Display a summary of the structure
	console.log(`Structure generated with ${Object.keys(output).length} languages`);

	// Write the output file
	const dest = path.join(__dirname, "../static/labels.json");
	fs.writeFileSync(dest, JSON.stringify(output), {encoding:"utf-8"});
	
	// Also copy to dist if it exists
	const dest2 = path.join(__dirname, "../dist/labels.json");
	if (fs.existsSync(path.dirname(dest2))) {
		fs.writeFileSync(dest2, JSON.stringify(output), {encoding:"utf-8"});
	}

	// Server notification if possible
	if (credentials) {
		try {
			await fetch("http://localhost:3018/api/admin/labels/reload", {
				method: "POST", 
				headers: {"Content-Type": "application/json"}, 
				body: JSON.stringify({key: credentials.csrf_key})
			});
		} catch(error) { /* ignore */ }
	}

	console.log("\x1b[32m All files compiled to:", dest, "\x1b[0m");
}

// Execute the process
processLabels().catch(error => console.error("Error processing labels:", error));

if (process.argv.includes("--pm2")) {
	//avoid infinite reboot in pm2 execution context
	//PM2 will watch for label files change and restart the script automatically
	process.stdin.resume();
}