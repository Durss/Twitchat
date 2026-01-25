import * as fs from "fs";
import * as path from "path";
import {fileURLToPath} from 'url';
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const suffix = branch == "beta" || branch == "v17"? "-beta" : "";

//Version upgrade type major, minor or patch
const upgradeType = args[0] || "minor";

// Load the package.json file
const packageJsonPath = path.join(__dirname, '..', 'package.json');

//Remove suffix
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = packageJson.version.replace(suffix, "");
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, "	"));

console.log("Update", upgradeType);
execSync("npm version "+upgradeType+" --no-git-tag-version", { stdio: "inherit" });
console.log("Update done", packageJson.version);

//Add suffix
const packageJsonNew = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJsonNew.version = packageJsonNew.version + suffix;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonNew, undefined, "	"));

console.info(`Version bumped to ${packageJsonNew.version}`);

execSync("git add .", { stdio: "inherit" });
const commitMessage = `Upgrade version to ${packageJsonNew.version}`;
execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
console.log(`Committed changes with message: "${commitMessage}"`);