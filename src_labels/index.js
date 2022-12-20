/**
 * This process takes all the JSON files within the "i18n" folder,
 * compiles them all together and output the public/labels.json file
 */
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
	const keys = f.replace(/\\+/g, "\\").replace(rootDir, "").replace(/\.json$/gi, "").split("\\");
	// keys.pop()
	console.log(keys);
	let json = {};
	try {
		json = JSON.parse(fs.readFileSync(f, "utf-8"));
	}catch(erro) {
		console.log("Invalid JSON", f)
		continue;
	}
	
	let pointer = output;
	for (let j = 0; j < keys.length; j++) {
		const k = keys[j];
		if(!pointer.hasOwnProperty(k)) {
			pointer[k] = {};
		}
		if(j==keys.length-1) {
			pointer[k] = json[k];
		}else{
			pointer = pointer[k];
		}
	}
}
const dest = path.join(__dirname, "../public/labels.json");
fs.writeFileSync(dest, JSON.stringify(output));

console.log("\x1b[32m All files compiled to:", dest, "\x1b[0m");

if(process.argv.includes("--pm2")) {
	//avoid infinite reoot in pm2 execution context
	process.stdin.resume();
}