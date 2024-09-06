import * as fs from "fs";
import * as path from "path";
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the package.json file
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Modify the version to include the _beta suffix
packageJson.version = `${packageJson.version}-beta`;

// Write the updated package.json back to the file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, "	"));

console.info(`Version bumped to ${packageJson.version}`);
