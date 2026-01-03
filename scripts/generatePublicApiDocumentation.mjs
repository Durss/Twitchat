import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../src_front/events/TwitchatEvent.ts');
const OUTPUT_FILE = path.join(__dirname, '../PUBLIC_API.md');
const INJECT_MARKER = '<!-- INJECT_AFTER -->';

/**
 * This file generates the PUBLIC_API documentation from the actual TypeScript type definitions.
 * 🤖 Generated with copilot because i'm too dumb to do it myself :3
 */


/**
 * Main function
 */
function main() {
	console.log('Setting up TypeScript compiler...');
	const program = createTypeScriptProgram();
	const checker = program.getTypeChecker();
	const sourceFile = program.getSourceFile(INPUT_FILE);
	
	if (!sourceFile) {
		throw new Error('Could not load source file');
	}
	
	console.log('Finding TwitchatEventMap type...');
	const eventMapType = findTwitchatEventMapType(sourceFile, checker);
	
	if (!eventMapType) {
		throw new Error('Could not find TwitchatEventMap type');
	}
	
	console.log('Extracting events...');
	const events = extractEventsFromType(eventMapType, checker);
	
	console.log(`Found ${events.length} events (excluding @private)`);
	
	console.log('Generating markdown...');
	const markdown = generateMarkdown(events);
	
	console.log(`Reading existing ${OUTPUT_FILE}...`);
	const existingContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
	
	console.log('Injecting generated content...');
	const markerIndex = existingContent.indexOf(INJECT_MARKER);
	
	if (markerIndex === -1) {
		throw new Error(`Could not find injection marker "${INJECT_MARKER}" in ${OUTPUT_FILE}`);
	}
	
	// Keep everything before and including the marker, then add the generated content
	const beforeMarker = existingContent.substring(0, markerIndex + INJECT_MARKER.length);
	const updatedContent = beforeMarker + '\n\n' + markdown;
	
	console.log(`Writing to ${OUTPUT_FILE}...`);
	fs.writeFileSync(OUTPUT_FILE, updatedContent, 'utf-8');
	
	console.log('Done!');
}

/**
 * Create a TypeScript program for type checking
 */
function createTypeScriptProgram() {
	const configPath = path.join(__dirname, '../tsconfig.json');
	
	let compilerOptions = {
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ES2020,
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		esModuleInterop: true,
		skipLibCheck: true,
		noEmit: true
	};
	
	// Try to read tsconfig if it exists
	if (fs.existsSync(configPath)) {
		const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsedConfig = ts.parseJsonConfigFileContent(
			configFile.config,
			ts.sys,
			path.dirname(configPath)
		);
		compilerOptions = parsedConfig.options;
	}
	
	return ts.createProgram({
		rootNames: [INPUT_FILE],
		options: compilerOptions
	});
}

/**
 * Find the TwitchatEventMap type alias in the source file
 */
function findTwitchatEventMapType(sourceFile, checker) {
	let eventMapNode = null;
	
	function visit(node) {
		if (ts.isTypeAliasDeclaration(node) && node.name.text === 'TwitchatEventMap') {
			eventMapNode = node;
		}
		ts.forEachChild(node, visit);
	}
	
	visit(sourceFile);
	
	if (!eventMapNode) return null;
	
	return checker.getTypeAtLocation(eventMapNode);
}

/**
 * Extract all events from the TwitchatEventMap type
 */
function extractEventsFromType(type, checker) {
	const events = [];
	const properties = type.getProperties();
	
	for (const prop of properties) {
		// Get JSDoc to check for @private
		const jsDocTags = prop.getJsDocTags();
		const isPrivate = jsDocTags.some(tag => tag.name === 'private');
		
		if (isPrivate) {
			continue; // Skip private events
		}
		
		// Get description from JSDoc
		const description = ts.displayPartsToString(prop.getDocumentationComment(checker));
		
		// Get the event name
		const eventName = prop.getName();
		
		// Get the type
		const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
		
		// Convert type to formatted string
		const typeString = typeToFormattedString(propType, checker, 0);
		
		events.push({
			name: eventName,
			description: description.trim(),
			type: typeString
		});
	}
	
	return events;
}

/**
 * Convert a TypeScript type to a formatted string with proper indentation
 */
function typeToFormattedString(type, checker, indent = 0, visited = new Set()) {
	const indentStr = '\t'.repeat(indent);
	
	// Prevent infinite recursion for circular references
	const typeId = checker.typeToString(type);
	if (visited.has(typeId)) {
		return 'any /* circular reference */';
	}
	visited.add(typeId);
	
	// Handle undefined
	if (type.flags & ts.TypeFlags.Undefined) return 'undefined';
	if (type.flags & ts.TypeFlags.Null) return 'null';
	
	// Handle void
	if (type.flags & ts.TypeFlags.Void) return 'void';
	
	// Handle basic types
	if (type.flags & ts.TypeFlags.String) return 'string';
	if (type.flags & ts.TypeFlags.Number) return 'number';
	if (type.flags & ts.TypeFlags.Boolean) return 'boolean';
	if (type.flags & ts.TypeFlags.Any) return 'any';
	
	// Handle string/number/boolean literals
	if (type.flags & ts.TypeFlags.StringLiteral) {
		return `"${type.value}"`;
	}
	if (type.flags & ts.TypeFlags.NumberLiteral) {
		return `${type.value}`;
	}
	if (type.flags & ts.TypeFlags.BooleanLiteral) {
		return type.intrinsicName;
	}
	
	// Handle arrays
	if (checker.isArrayType(type)) {
		const typeArgs = checker.getTypeArguments(type);
		if (typeArgs && typeArgs.length > 0) {
			const elementType = typeToFormattedString(typeArgs[0], checker, indent, new Set(visited));
			// If element type is complex (object), format it properly
			if (elementType.startsWith('{')) {
				return elementType + '[]';
			}
			return `${elementType}[]`;
		}
		return 'any[]';
	}
	
	// Handle union types
	if (type.isUnion()) {
		const types = type.types;
		
		// Check if this is an optional type (Type | undefined)
		const hasUndefined = types.some(t => t.flags & ts.TypeFlags.Undefined);
		const nonUndefinedTypes = types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
		
		// Check if this is boolean (true | false) or optional boolean (undefined | true | false)
		const allBooleanLiterals = nonUndefinedTypes.every(t => t.flags & ts.TypeFlags.BooleanLiteral);
		if (allBooleanLiterals && nonUndefinedTypes.length === 2) {
			// This is a boolean or optional boolean
			return 'boolean';
		}
		
		if (hasUndefined && types.length === 2) {
			// This is an optional type, show it more cleanly
			const nonUndefinedType = types.find(t => !(t.flags & ts.TypeFlags.Undefined));
			if (nonUndefinedType) {
				return typeToFormattedString(nonUndefinedType, checker, indent, new Set(visited));
			}
		}
		
		const typeStrs = types.map(t => typeToFormattedString(t, checker, indent, new Set(visited)));
		return typeStrs.join('|');
	}
	
	// Handle intersection types
	if (type.isIntersection()) {
		const types = type.types.map(t => typeToFormattedString(t, checker, indent, new Set(visited)));
		return types.join(' & ');
	}
	
	// Handle object types
	if (type.flags & ts.TypeFlags.Object) {
		const properties = checker.getPropertiesOfType(type);
		
		// Check for index signatures
		const stringIndexType = type.getStringIndexType();
		const numberIndexType = type.getNumberIndexType();
		
		if (properties.length === 0 && !stringIndexType && !numberIndexType) {
			return '{}';
		}
		
		let result = '{\n';
		
		// Add properties
		for (const prop of properties) {
			// Try to get the type of the property from the type itself first
			// This works better with utility types like Pick<> and Omit<>
			let propType;
			try {
				propType = checker.getTypeOfPropertyOfType(type, prop.getName());
			} catch (e) {
				// Fallback to the old method
				propType = null;
			}
			
			// If that didn't work, fall back to getting it from the symbol
			if (!propType) {
				propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
			}
			
			const propName = prop.getName();
			const optional = (prop.flags & ts.SymbolFlags.Optional) ? '?' : '';
			
			// Get JSDoc comment if available
			const jsDoc = ts.displayPartsToString(prop.getDocumentationComment(checker));
			if (jsDoc) {
				result += `${indentStr}\t/**\n`;
				jsDoc.split('\n').forEach(line => {
					result += `${indentStr}\t * ${line}\n`;
				});
				result += `${indentStr}\t */\n`;
			}
			
			const propTypeStr = typeToFormattedString(propType, checker, indent + 1, new Set(visited));
			
			// Handle multi-line types (objects)
			if (propTypeStr.startsWith('{') && propTypeStr.includes('\n')) {
				result += `${indentStr}\t${propName}${optional}: ${propTypeStr};\n`;
			} else {
				result += `${indentStr}\t${propName}${optional}: ${propTypeStr};\n`;
			}
		}
		
		// Add index signatures
		if (stringIndexType) {
			const indexTypeStr = typeToFormattedString(stringIndexType, checker, indent + 1, new Set(visited));
			result += `${indentStr}\t[key: string]: ${indexTypeStr};\n`;
		}
		if (numberIndexType) {
			const indexTypeStr = typeToFormattedString(numberIndexType, checker, indent + 1, new Set(visited));
			result += `${indentStr}\t[key: number]: ${indexTypeStr};\n`;
		}
		
		result += `${indentStr}}`;
		return result;
	}
	
	// Fallback: use TypeScript's type-to-string
	const typeStr = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
	
	// If it's a simple type reference, just return it
	return typeStr;
}

/**
 * Generate markdown documentation for all events
 */
function generateMarkdown(events) {
	// Categorize events by prefix
	const onEvents = [];
	const setEvents = [];
	const getEvents = [];
	const otherEvents = [];
	
	for (const event of events) {
		if (event.name.startsWith('ON_')) {
			onEvents.push(event);
		} else if (event.name.startsWith('SET_')) {
			setEvents.push(event);
		} else if (event.name.startsWith('GET_')) {
			getEvents.push(event);
		} else {
			otherEvents.push(event);
		}
	}
	
	// Sort each category alphabetically
	onEvents.sort((a, b) => a.name.localeCompare(b.name));
	setEvents.sort((a, b) => a.name.localeCompare(b.name));
	getEvents.sort((a, b) => a.name.localeCompare(b.name));
	otherEvents.sort((a, b) => a.name.localeCompare(b.name));
	
	let markdown = "";
	
	// Generate documentation for each section
	if (onEvents.length > 0) {
		markdown += `# Events you can receive\n<details>\n<summary>Events fired by Twitchat that can be listened to.</summary>\n\n`;
		for (const event of onEvents) {
			markdown += formatEvent(event, '###');
		}
		markdown += `</details>\n\n`;
	}
	
	if (setEvents.length > 0) {
		markdown += `# Actions you can perform\n<details>\n<summary>Actions you can request Twitchat to perform.</summary>\n\n`;
		for (const event of setEvents) {
			markdown += formatEvent(event, '##');
		}
		markdown += `</details>\n\n`;
	}
	
	if (getEvents.length > 0) {
		markdown += `# Requesting data\n<details>\n<summary>Data you can request from Twitchat.</summary>\n\n`;
		for (const event of getEvents) {
			markdown += formatEvent(event, '##');
		}
		markdown += `</details>\n\n`;
	}
	
	if (otherEvents.length > 0) {
		markdown += `# Other Events\n<details>\n<summary>Other events that don't follow the standard naming convention</summary>\n\n`;
		for (const event of otherEvents) {
			markdown += formatEvent(event, '##');
		}
		markdown += `</details>\n\n`;
	}
	
	return markdown;
}

/**
 * Format a single event as markdown
 */
function formatEvent(event, headingLevel = '##') {
	let result = `${headingLevel} **${event.name}**\n`;
	
	if (event.description) {
		result += `${event.description}  \n`;
	}
	
	result += `<details>\n<summary>JSON params</summary>\n\n`;
	
	if (event.type === 'undefined') {
		result += '```\n-none-\n```\n\n';
	} else {
		result += '```typescript\n';
		result += event.type + '\n';
		result += '```\n\n';
	}
	
	result += `</details>\n\n`;
	
	return result;
}

main();
