import * as fs from "fs";
import * as path from "path";
import {fileURLToPath} from 'url';
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

//Version upgrade type major, minor or patch
const upgradeType = args[0] || "minor";

// Load the package.json file
const packageJsonPath = path.join(__dirname, '..', 'package.json');

//Remove "-beta" suffix
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = packageJson.version.replace("-beta", "");
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, "	"));

console.log("Update", upgradeType);
execSync("npm version "+upgradeType+" --no-git-tag-version", { stdio: "inherit" });
console.log("Update done", packageJson.version);

//Add "-beta" suffix
const packageJsonNew = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJsonNew.version = `${packageJsonNew.version}-beta`;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonNew, undefined, "	"));

console.info(`Version bumped to ${packageJsonNew.version}`);

execSync("git add .", { stdio: "inherit" });
const commitMessage = `Upgrade version to ${packageJsonNew.version}`;
execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
console.log(`Committed changes with message: "${commitMessage}"`);