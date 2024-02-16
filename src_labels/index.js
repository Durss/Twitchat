/**
 * This process takes all the JSON files within the "i18n" folder,
 * compiles them all together and output the static/labels.json file
 */
// import * as fs from "fs";
// import * as path from "path";
// import {fileURLToPath} from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const fs = require("fs");
const path = require("path");

console.log("\x1b[36m \n Compiling all label files into one... \x1b[0m");
function getLabelFilesFrom(p) {
	const entries = fs.readdirSync(p);
	let files = [];
	for(let i=0; i < entries.length; i++) {
		const f = entries[i];
		if(f == "." || f == "..") continue;
		const filePath = path.join(p, f);
		if(fs.lstatSync(filePath).isDirectory())  {
			files = files.concat(getLabelFilesFrom(filePath))
		}else if(/\.json$/gi.test(filePath)){
			files.push(filePath);
		}
	}
	return files;
}

const rootDir = path.join(__dirname, "../i18n/");
const files = getLabelFilesFrom(rootDir);
const output = {};
for(let i=0; i < files.length; i++) {
	const f = files[i];
	const keys = f.replace(rootDir, "").replace(/\.json$/gi, "").split(path.sep);
	const lang = keys[0];
	// keys.pop()
	let json = {};
	try {
		json = JSON.parse(fs.readFileSync(f, "utf-8"));
	}catch(erro) {
		console.log("\x1b[41m Invalid JSON ", f, "\x1b[0m");
		continue;
	}

	if(!output[lang]) {
		output[lang] = {};
	}
	for (const k in json) {
		output[lang][k] = json[k];
	}
	
}
const dest = path.join(__dirname, "../static/labels.json");
fs.writeFileSync(dest, JSON.stringify(output), {encoding:"utf-8"});

console.log("\x1b[32m All files compiled to:", dest, "\x1b[0m");

if(process.argv.includes("--pm2")) {
	//avoid infinite reboot in pm2 execution context
	//PM2 will watch for label files change and restart the script automatically
	process.stdin.resume();
}