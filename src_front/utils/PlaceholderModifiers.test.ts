/**
 * Tests for the placeholder modifiers.
 *
 * Run with: npm test
 */

import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
	applyModifiers,
	configureI18n,
	findPlaceholders,
	getModifierNames,
	type OrdinalLabels,
	replacePlaceholder,
	replacePlaceholders,
	splicePlaceholders,
	unescapeLiteralPlaceholders,
} from "./PlaceholderModifiers";

/**
 * Every modifier a test actually ran, filled by parse().
 * Checked by the "modifier coverage" suite at the bottom of this file.
 */
const executedModifiers = new Set<string>();

/**
 * Replays what TriggerActionHandler does: replaces the {TAG...} occurrences
 * by a value, running the modifiers of each occurrence on it.
 */
function parse(src: string, tag: string, value: string): string {
	return replacePlaceholder(src, tag, (modifiers) => {
		for (const modifier of modifiers) executedModifiers.add(modifier.name);
		return applyModifiers(value, modifiers);
	});
}

//The i18n configuration is module wide, make sure a test never inherits
//the one set up by a previous test
beforeEach(() => configureI18n());
afterAll(() => configureI18n());

describe("placeholder parsing", () => {
	it("replaces a tag", () => {
		expect(parse("hi {USER}!", "USER", "Durss")).toBe("hi Durss!");
	});
	it("matches the tag whatever its case", () => {
		expect(parse("hi {user}!", "USER", "Durss")).toBe("hi Durss!");
	});
	it("replaces every occurrence", () => {
		expect(parse("{USER} & {USER}", "USER", "D")).toBe("D & D");
	});
	it("leaves the other tags alone", () => {
		expect(parse("hi {OTHER}", "USER", "D")).toBe("hi {OTHER}");
	});
	it("leaves a text without placeholder alone", () => {
		expect(parse("hello", "USER", "D")).toBe("hello");
	});
	it("does not match a longer tag starting the same way", () => {
		expect(parse("{USER_ID}", "USER", "D")).toBe("{USER_ID}");
	});
	it("removes the tag when the value is empty", () => {
		expect(parse("[{USER}]", "USER", "")).toBe("[]");
	});
});

describe("modifiers", () => {
	it("applies a modifier", () => {
		expect(parse("{USER.uppercase}", "USER", "durss")).toBe("DURSS");
	});
	it("chains them from left to right", () => {
		expect(parse("{USER.trim.uppercase}", "USER", "  durss ")).toBe("DURSS");
	});
	it("accepts any case for the modifier name", () => {
		expect(parse("{USER.UpperCase}", "USER", "durss")).toBe("DURSS");
	});
	it("applies them per occurrence", () => {
		expect(parse("{USER.upper}/{USER.lower}", "USER", "Du")).toBe("DU/du");
	});
	it("ignores an unknown modifier rather than dropping the value", () => {
		expect(parse("{USER.nope}", "USER", "Du")).toBe("Du");
	});
});

describe("replacePlaceholders", () => {
	it("replaces several tags in one call", () => {
		expect(
			replacePlaceholders("{USER} raided with {VIEWERS}!", { USER: "Durss", VIEWERS: 42 }),
		).toBe("Durss raided with 42!");
	});
	it("applies the modifiers of each tag", () => {
		expect(
			replacePlaceholders("{USER.uppercase} / {VIEWERS.separator}", {
				USER: "durss",
				VIEWERS: 1234567,
			}),
		).toBe("DURSS / 1,234,567");
	});
	it("accepts numbers", () => {
		expect(replacePlaceholders("{N.add(1)}", { N: 41 })).toBe("42");
	});
	it("turns a null or undefined value into an empty text", () => {
		expect(replacePlaceholders("[{A}][{B}]", { A: null, B: undefined })).toBe("[][]");
	});
	//A tag absent from the values is left in place, which is what lets the
	//callers replace a tag only under some condition
	it("leaves a tag that was not given alone", () => {
		expect(replacePlaceholders("{USER} {CMD}", { USER: "Durss" })).toBe("Durss {CMD}");
	});
	it("handles the literal escape", () => {
		expect(replacePlaceholders("{{USER}} is {USER}", { USER: "Durss" })).toBe(
			"{USER} is Durss",
		);
	});
	it("returns an empty source untouched", () => {
		expect(replacePlaceholders("", { USER: "Durss" })).toBe("");
	});
});

describe("documentation", () => {
	//Catches adding or removing a modifier without running "npm run genmodifiers"
	const doc = readFileSync(new URL("../../PLACEHOLDER_MODIFIERS.md", import.meta.url), "utf8");
	const documented = [...doc.matchAll(/^### (\w+)/gm)].map((m) => m[1] ?? "");
	const aliases = [...doc.matchAll(/_Also available as ([^_]+)\._/g)].flatMap((m) =>
		[...(m[1] ?? "").matchAll(/`(\w+)`/g)].map((x) => x[1] ?? ""),
	);
	const allDocumented = new Set([...documented, ...aliases]);

	it("documents every modifier", () => {
		expect(getModifierNames().filter((name) => !allDocumented.has(name))).toEqual([]);
	});
	it("documents no modifier that no longer exists", () => {
		const runtime = getModifierNames();
		expect([...allDocumented].filter((name) => !runtime.includes(name))).toEqual([]);
	});
});

describe("modifier arguments", () => {
	it("reads a bare argument", () => {
		expect(parse("{U.default(anonymous)}", "U", "")).toBe("anonymous");
	});
	it("reads a quoted argument holding a bracket", () => {
		expect(parse('{U.default("nobody :)")}', "U", "")).toBe("nobody :)");
	});
	it("reads a quoted argument holding a comma", () => {
		expect(parse('{M.replace("a, b", "c")}', "M", "x a, b y")).toBe("x c y");
	});
	it("reads a quoted argument holding a brace", () => {
		expect(parse('{U.default("{none}")}', "U", "")).toBe("{none}");
	});
	it("accepts single quotes", () => {
		expect(parse("{U.default('he said \"hi\"')}", "U", "")).toBe('he said "hi"');
	});
	it("accepts curly quotes, which phones and Discord insert", () => {
		expect(parse("{U.default(\u201Cnobody :)\u201D)}", "U", "")).toBe("nobody :)");
	});
	it("unescapes a quote written as backslash quote", () => {
		expect(parse('{U.default("say \\"hi\\"")}', "U", "")).toBe('say "hi"');
	});
	it("keeps a quote inside a bare argument", () => {
		expect(parse('{U.default(he said "hi")}', "U", "")).toBe('he said "hi"');
	});
	it("keeps the backslashes of a windows path", () => {
		expect(parse('{U.default("C:\\Users\\franc")}', "U", "")).toBe("C:\\Users\\franc");
	});
	it("accepts an empty quoted argument", () => {
		expect(parse('{U.default("")}', "U", "")).toBe("");
	});
	it("tolerates a trailing comma", () => {
		expect(parse("{U.default(x,)}", "U", "")).toBe("x");
	});
	//Trimming bare arguments is what makes "bool(sub, not a sub)" read
	//naturally, so spaces that matter have to be quoted
	it("trims a bare argument", () => {
		expect(parse("{B.join( | )}", "B", "a, b")).toBe("a|b");
	});
	it("keeps the spaces of a quoted argument", () => {
		expect(parse('{B.join(" | ")}', "B", "a, b")).toBe("a | b");
	});
	it("always keeps the spaces inside an argument", () => {
		expect(parse("{S.bool(is a sub, is not a sub)}", "S", "true")).toBe("is a sub");
	});
});

describe("literal placeholder escape", () => {
	it("does not replace a doubled placeholder", () => {
		expect(unescapeLiteralPlaceholders(parse("{{USER}} is {USER}", "USER", "D"))).toBe(
			"{USER} is D",
		);
	});
	it("does not replace a doubled placeholder holding modifiers", () => {
		expect(unescapeLiteralPlaceholders(parse("{{USER.upper}}", "USER", "D"))).toBe(
			"{USER.upper}",
		);
	});
	it("leaves mustache style templates alone", () => {
		expect(unescapeLiteralPlaceholders(parse("{{ x }}", "USER", "D"))).toBe("{{ x }}");
	});
	it("leaves json alone", () => {
		expect(unescapeLiteralPlaceholders(parse('{"a":{"b":1}}', "USER", "D"))).toBe(
			'{"a":{"b":1}}',
		);
	});
});

/**
 * Replays what TriggerActionHandler does: locates the placeholders of a text
 * then splices the resolved values in, in a single pass.
 */
function parseAll(src: string, values: { [tag: string]: string }): string {
	const known = new Set(Object.keys(values).map((t) => t.toUpperCase()));
	const occurrences = findPlaceholders(src, (tag) => known.has(tag));
	return unescapeLiteralPlaceholders(
		splicePlaceholders(src, occurrences, (tag) => values[tag]),
	);
}

const anyTag = () => true;

describe("finding the placeholders of a text", () => {
	it("lists them in the order they are written", () => {
		expect(findPlaceholders("hi {USER}, {MESSAGE}!", anyTag).map((o) => o.tag)).toEqual([
			"USER",
			"MESSAGE",
		]);
	});
	it("uppercases the tags", () => {
		expect(findPlaceholders("{user}", anyTag).map((o) => o.tag)).toEqual(["USER"]);
	});
	it("reports every occurrence of a same tag", () => {
		expect(findPlaceholders("{USER} {user}", anyTag).map((o) => o.tag)).toEqual([
			"USER",
			"USER",
		]);
	});
	it("parses the modifiers of each occurrence", () => {
		const found = findPlaceholders("{USER.uppercase}{USER}", anyTag);
		expect(found.map((o) => o.modifiers.map((m) => m.name))).toEqual([["uppercase"], []]);
	});
	it("reports the span of the occurrence", () => {
		const [found] = findPlaceholders("ab {USER} cd", anyTag);
		expect([found?.start, found?.end]).toEqual([3, 9]);
	});
	it("skips the tags the caller does not know", () => {
		expect(findPlaceholders("{USER} {NOPE}", (tag) => tag == "USER").map((o) => o.tag)).toEqual(
			["USER"],
		);
	});
	it("skips a tag with no fixed charset support, ex: a slugified counter", () => {
		expect(findPlaceholders("{COUNTER_MY-COUNT}", anyTag).map((o) => o.tag)).toEqual([
			"COUNTER_MY-COUNT",
		]);
	});
	it("skips the escaped placeholders", () => {
		expect(findPlaceholders("{{USER}}", anyTag)).toEqual([]);
	});
	it("skips malformed placeholders", () => {
		expect(findPlaceholders("{U.default(x}", anyTag)).toEqual([]);
	});
	//Tags have no fixed charset so anything up to the "." or the "}" is handed
	//to isKnownTag(). That's what keeps a json payload from being touched
	it("leaves json alone, none of its braces holds a known tag", () => {
		const known = (tag: string) => tag == "USER";
		expect(findPlaceholders('{"a":{"b":1}} {USER}', known).map((o) => o.tag)).toEqual(["USER"]);
	});
	it("reports a placeholder nested in another one's arguments on that argument", () => {
		const [found] = findPlaceholders('{STATE.bool("win {USER1}", "lose {USER2}")}', anyTag);
		//Not reported on their own, they belong to the argument they're written on
		expect([found?.tag]).toEqual(["STATE"]);
		expect(
			found?.modifiers[0]?.argPlaceholders?.map((arg) => arg.map((o) => o.tag)),
		).toEqual([["USER1"], ["USER2"]]);
	});
	it("hands the nested tags to isKnownTag so the caller can resolve them", () => {
		const seen: string[] = [];
		findPlaceholders('{STATE.bool("{USER}", "")}', (tag) => {
			seen.push(tag);
			return true;
		});
		expect(seen).toEqual(["STATE", "USER"]);
	});
	it("leaves an argument holding no placeholder untouched", () => {
		const [found] = findPlaceholders('{STATE.bool("yes", "no")}', anyTag);
		expect(found?.modifiers[0]?.argPlaceholders).toBeUndefined();
	});
	it("does not choke on an unterminated brace", () => {
		expect(findPlaceholders("{USER", anyTag)).toEqual([]);
	});
});

describe("placeholders nested in modifier arguments", () => {
	it("resolves them, both arms of a bool", () => {
		const values = { LIVE: "true", USER: "Durss" };
		expect(
			parseAll(`{LIVE.bool("{USER} is live", "{USER} is not live")}`, values),
		).toBe("Durss is live");
		expect(
			parseAll(`{LIVE.bool("{USER} is live", "{USER} is not live")}`, {
				...values,
				LIVE: "false",
			}),
		).toBe("Durss is not live");
	});
	it("applies the modifiers of the nested placeholder", () => {
		expect(parseAll(`{LIVE.bool("{USER.uppercase}", "")}`, { LIVE: "true", USER: "durss" })).toBe(
			"DURSS",
		);
	});
	it("supports a chain of any length on a nested placeholder", () => {
		expect(
			parseAll(`{LIVE.bool("{USER.trim.uppercase.truncate(4)}", "")}`, {
				LIVE: "true",
				USER: "  durss ",
			}),
		).toBe("DURS…");
	});
	it("works with default()", () => {
		expect(parseAll(`{MESSAGE.default("{USER} said nothing")}`, { MESSAGE: "", USER: "Durss" })).toBe(
			"Durss said nothing",
		);
	});
	it("leaves an unknown nested tag written as is", () => {
		expect(parseAll(`{LIVE.bool("{NOPE} hi", "")}`, { LIVE: "true" })).toBe("{NOPE} hi");
	});
	it("honors the {{TAG}} escape within an argument", () => {
		expect(parseAll(`{LIVE.bool("{{USER}}", "")}`, { LIVE: "true", USER: "Durss" })).toBe(
			"{USER}",
		);
	});
	//MAX_NESTING is 2: reaching a 3rd level needs escaped quotes within an
	//already quoted argument, and stays literal text
	it("stops at 2 levels", () => {
		expect(
			parseAll(`{LIVE.bool("{A.default(\\"{USER}\\")}", "")}`, {
				LIVE: "true",
				A: "",
				USER: "Durss",
			}),
		).toBe("{USER}");
	});
	//The whole point: nesting is a property of the source text, which the
	//streamer wrote. It must not give viewer text a way back in
	it("does not let a resolved value inject a nested placeholder", () => {
		expect(
			parseAll("{MESSAGE}", {
				MESSAGE: `{LIVE.bool("{USER} is live", "")}`,
				LIVE: "true",
				USER: "Durss",
			}),
		).toBe(`{LIVE.bool("{USER} is live", "")}`);
	});
	it("does not let a value land in an argument and get parsed", () => {
		expect(
			parseAll(`{LIVE.bool("{MESSAGE}", "")}`, {
				LIVE: "true",
				MESSAGE: "{USER}",
				USER: "Durss",
			}),
		).toBe("{USER}");
	});
});

describe("a resolved value is never parsed again", () => {
	it("does not replace a tag a viewer wrote on their message", () => {
		expect(parseAll("{MESSAGE}", { MESSAGE: "hey {USER}", USER: "Durss" })).toBe("hey {USER}");
	});
	it("whatever the order the tags are written in", () => {
		expect(parseAll("{USER}: {MESSAGE}", { USER: "Durss", MESSAGE: "hey {USER}" })).toBe(
			"Durss: hey {USER}",
		);
		expect(parseAll("{MESSAGE} -- {USER}", { USER: "Durss", MESSAGE: "hey {USER}" })).toBe(
			"hey {USER} -- Durss",
		);
	});
	//The regex based escaping this replaced could not cover it: parseArguments()
	//accepts braces within a quoted argument, no "[^{}]" pattern can span that
	it("closes the quoted argument bypass", () => {
		expect(parseAll("{MESSAGE}", { MESSAGE: '{USER.default("{x}")}', USER: "Durss" })).toBe(
			'{USER.default("{x}")}',
		);
	});
	it("does not let a value inject a tag holding modifiers", () => {
		expect(parseAll("{MESSAGE}", { MESSAGE: "{USER.uppercase}", USER: "Durss" })).toBe(
			"{USER.uppercase}",
		);
	});
	//Those come from HTTP responses, AI output or chat command captures
	it("does not let a dynamic value inject into another one", () => {
		expect(parseAll("{A} {B}", { A: "{B}", B: "pwned" })).toBe("{B} pwned");
	});
	it("still resolves the tags written by the streamer on the trigger", () => {
		expect(parseAll("{USER} said {MESSAGE}", { USER: "Durss", MESSAGE: "hi" })).toBe(
			"Durss said hi",
		);
	});
	it("keeps honoring the {{TAG}} escape of the trigger's own text", () => {
		expect(parseAll("{{USER}} is {USER}", { USER: "Durss" })).toBe("{USER} is Durss");
	});
});

describe("malformed placeholders are left as plain text", () => {
	it("unterminated quote", () => {
		expect(parse('{U.default("oops}', "U", "D")).toBe('{U.default("oops}');
	});
	it("missing closing bracket", () => {
		expect(parse("{U.default(x}", "U", "D")).toBe("{U.default(x}");
	});
	it("empty modifier name", () => {
		expect(parse("{U.}", "U", "D")).toBe("{U.}");
	});
	it("trailing dot", () => {
		expect(parse("{U.upper.}", "U", "D")).toBe("{U.upper.}");
	});
	it("missing closing brace", () => {
		expect(parse("{U.upper", "U", "D")).toBe("{U.upper");
	});
});

describe("text modifiers", () => {
	it("uppercase", () => {
		expect(parse("{U.uppercase}", "U", "durss")).toBe("DURSS");
	});
	it("lowercase", () => {
		expect(parse("{U.lowercase}", "U", "DURSS")).toBe("durss");
	});
	it("titlecase", () => {
		expect(parse("{T.titlecase}", "T", "hello world")).toBe("Hello World");
	});
	it("titlecase keeps the rest of each word untouched", () => {
		expect(parse("{T.titlecase}", "T", "hello wORLD")).toBe("Hello WORLD");
	});
	it("trim", () => {
		expect(parse("{M.trim}", "M", "  hello  ")).toBe("hello");
	});
	it("nospace removes every space, not just the surrounding ones", () => {
		expect(parse("{U.nospace}", "U", " John \t Doe ")).toBe("JohnDoe");
	});
	it("truncate", () => {
		expect(parse("{M.truncate(5)}", "M", "abcdefghij")).toBe("abcde…");
	});
	it("truncate with a custom ellipsis", () => {
		expect(parse("{M.truncate(3, ...)}", "M", "abcdef")).toBe("abc...");
	});
	it("truncate leaves a short value alone", () => {
		expect(parse("{M.truncate(50)}", "M", "abc")).toBe("abc");
	});
	it("capitalize keeps the rest of the value untouched", () => {
		expect(parse("{U.capitalize}", "U", "mcDonald")).toBe("McDonald");
	});
	it("repeat", () => {
		expect(parse("{E.repeat(3)}", "E", "Kappa")).toBe("KappaKappaKappa");
	});
	it("repeat defaults to a single copy", () => {
		expect(parse("{E.repeat}", "E", "Kappa")).toBe("Kappa");
	});
	//A trigger sending 100k chars to an overlay or a chat message is
	//nothing but a mistake
	it("repeat is capped", () => {
		expect(parse("{E.repeat(9999)}", "E", "a")).toBe("a".repeat(100));
	});
	it("padstart", () => {
		expect(parse("{S.padstart(5, 0)}", "S", "42")).toBe("00042");
	});
	it("padstart pads with spaces by default", () => {
		expect(parse("{S.padstart(4)}", "S", "42")).toBe("  42");
	});
	it("padstart leaves a longer value alone", () => {
		expect(parse("{S.padstart(2)}", "S", "12345")).toBe("12345");
	});
	it("padend", () => {
		expect(parse("{U.padend(10, .)}", "U", "Durss")).toBe("Durss.....");
	});
	it("replace", () => {
		expect(parse("{M.replace(hello, hi)}", "M", "hello world")).toBe("hi world");
	});
	it("replace searches a plain text, not a regular expression", () => {
		expect(parse("{M.replace(a.c, x)}", "M", "abc a.c")).toBe("abc x");
	});
	it("replace drops the searched text when given no replacement", () => {
		expect(parse("{M.replace(hello)}", "M", "hello world")).toBe(" world");
	});
	it("remove", () => {
		expect(parse("{M.remove(spoiler)}", "M", "spoiler alert")).toBe(" alert");
	});
	it("mask", () => {
		expect(parse("{U.mask(3)}", "U", "Durss")).toBe("Dur**");
	});
	it("mask with a custom character", () => {
		expect(parse("{U.mask(2, ?)}", "U", "Durss")).toBe("Du???");
	});
	it("mask hides everything by default", () => {
		expect(parse("{U.mask}", "U", "Durss")).toBe("*****");
	});
	it("mock alternates the case", () => {
		expect(parse("{M.mock}", "M", "hello")).toBe("hElLo");
	});
	it("slug", () => {
		expect(parse("{T.slug}", "T", "Ma Super Émission !")).toBe("ma-super-emission");
	});
	it("initials", () => {
		expect(parse("{U.initials}", "U", "john doe")).toBe("JD");
	});
	it("striphtml", () => {
		expect(parse("{M.striphtml}", "M", "<b>hello</b>")).toBe("hello");
	});
	it("nourl", () => {
		expect(parse("{M.nourl}", "M", "check this https://twitchat.fr/ !")).toBe("check this  !");
	});
	it("nourl removes a link written without its protocol", () => {
		expect(parse("{M.nourl}", "M", "check this twitchat.fr/home")).toBe("check this");
	});
});

describe("unicode is never broken in half", () => {
	//One emoji made of five code units
	const FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";

	it("length counts what a human sees", () => {
		expect(parse("{U.length}", "U", "a" + FAMILY)).toBe("2");
	});
	it("reverse keeps the emoji whole", () => {
		expect(parse("{U.reverse}", "U", "ab" + FAMILY)).toBe(FAMILY + "ba");
	});
	it("truncate does not split an emoji", () => {
		expect(parse('{U.truncate(2,"")}', "U", "a" + FAMILY + "c")).toBe("a" + FAMILY);
	});
	it("left", () => {
		expect(parse("{U.left(2)}", "U", "a" + FAMILY + "c")).toBe("a" + FAMILY);
	});
	it("right", () => {
		expect(parse("{U.right(1)}", "U", "ab" + FAMILY)).toBe(FAMILY);
	});
	it("mask counts what a human sees", () => {
		expect(parse("{U.mask(1)}", "U", "a" + FAMILY)).toBe("a*");
	});
	it("stripemoji", () => {
		expect(parse("{M.stripemoji}", "M", "hello " + FAMILY)).toBe("hello");
	});
	it("deaccent", () => {
		expect(parse("{U.deaccent}", "U", "Franc\u0327ois")).toBe("Francois");
	});
});

describe("number modifiers", () => {
	it("add", () => {
		expect(parse("{C.add(10)}", "C", "5")).toBe("15");
	});
	it("does not produce floating point noise", () => {
		expect(parse("{C.add(0.2)}", "C", "0.1")).toBe("0.3");
	});
	it("leaves a non numeric value untouched", () => {
		expect(parse("{C.add(10)}", "C", "abc")).toBe("abc");
	});
	it("sub", () => {
		expect(parse("{C.sub(10)}", "C", "15")).toBe("5");
	});
	it("mul", () => {
		expect(parse("{C.mul(2)}", "C", "15")).toBe("30");
	});
	it("div", () => {
		expect(parse("{C.div(2)}", "C", "15")).toBe("7.5");
	});
	it("round", () => {
		expect(parse("{C.round(2)}", "C", "3.14159")).toBe("3.14");
	});
	it("round drops the decimals by default", () => {
		expect(parse("{C.round}", "C", "3.6")).toBe("4");
	});
	it("floor", () => {
		expect(parse("{C.floor}", "C", "3.7")).toBe("3");
	});
	it("ceil", () => {
		expect(parse("{C.ceil}", "C", "3.2")).toBe("4");
	});
	it("abs", () => {
		expect(parse("{C.abs}", "C", "-42")).toBe("42");
	});
	it("dividing by zero gives zero rather than an error", () => {
		expect(parse("{C.div(0)}", "C", "5")).toBe("0");
	});
	it("percent chains with round", () => {
		expect(parse("{C.percent(200).round}", "C", "50")).toBe("25");
	});
	it("min caps the value", () => {
		expect(parse("{C.min(100)}", "C", "250")).toBe("100");
	});
	it("max raises the value", () => {
		expect(parse("{C.max(10)}", "C", "3")).toBe("10");
	});
	it("clamp", () => {
		expect(parse("{C.clamp(1, 100)}", "C", "250")).toBe("100");
	});
	it("sign", () => {
		expect(parse("{C.sign}", "C", "5")).toBe("+5");
	});
	it("decimals", () => {
		expect(parse("{C.decimals(2)}", "C", "5")).toBe("5.00");
	});
});

describe("list modifiers", () => {
	it("first", () => {
		expect(parse("{B.first}", "B", "a, b, c")).toBe("a");
	});
	it("last", () => {
		expect(parse("{B.last}", "B", "a, b, c")).toBe("c");
	});
	it("nth starts at 1", () => {
		expect(parse("{B.nth(2)}", "B", "a, b, c")).toBe("b");
	});
	it("count", () => {
		expect(parse("{B.count}", "B", "a, b, c")).toBe("3");
	});
	it("join", () => {
		expect(parse('{B.join(" | ")}', "B", "a, b, c")).toBe("a | b | c");
	});
	it("unique", () => {
		expect(parse("{B.unique}", "B", "a, b, a")).toBe("a, b");
	});
	it("shuffle keeps every entry", () => {
		expect(parse("{B.shuffle}", "B", "b, a, d, c").split(", ").sort()).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
	});
	it("split on a custom separator", () => {
		expect(parse('{M.split(" ", 2)}', "M", "hello world")).toBe("world");
	});
});

describe("logic modifiers", () => {
	it("default replaces an empty value", () => {
		expect(parse("{U.default(anon)}", "U", "")).toBe("anon");
	});
	it("default keeps a filled value", () => {
		expect(parse("{U.default(anon)}", "U", "Durss")).toBe("Durss");
	});
	it("bool picks the first word when true", () => {
		expect(parse("{S.bool(sub, not a sub)}", "S", "true")).toBe("sub");
	});
	it("bool picks the second word when false", () => {
		expect(parse("{S.bool(sub, not a sub)}", "S", "false")).toBe("not a sub");
	});
	it("plural picks the singular", () => {
		expect(parse("{N} {N.plural(viewer, viewers)}", "N", "1")).toBe("1 viewer");
	});
	it("plural picks the plural", () => {
		expect(parse("{N} {N.plural(viewer, viewers)}", "N", "5")).toBe("5 viewers");
	});
	it("plural picks the zero word when given one", () => {
		expect(parse("{N.plural(viewer, viewers, nobody)}", "N", "0")).toBe("nobody");
	});
	it("equals", () => {
		expect(parse("{T.equals(3000, best, regular)}", "T", "3000")).toBe("best");
	});
	it("equals falls back to the value itself", () => {
		expect(parse("{T.equals(3000, best)}", "T", "1000")).toBe("1000");
	});
});

describe("encoding modifiers", () => {
	it("urlencode", () => {
		expect(parse("{M.urlencode}", "M", "hello world")).toBe("hello%20world");
	});
	it("urldecode", () => {
		expect(parse("{P.urldecode}", "P", "hello%20world")).toBe("hello world");
	});
	it("leaves an invalid url encoded value untouched", () => {
		expect(parse("{P.urldecode}", "P", "100% sure")).toBe("100% sure");
	});
	it("jsonescape", () => {
		expect(parse("{M.jsonescape}", "M", 'he said "hi"')).toBe('he said \\"hi\\"');
	});
	it("htmlescape", () => {
		expect(parse("{M.htmlescape}", "M", "<b>hi</b>")).toBe("&lt;b&gt;hi&lt;/b&gt;");
	});
	it("base64 round trip", () => {
		expect(parse("{M.base64decode}", "M", parse("{M.base64}", "M", "héllo"))).toBe("héllo");
	});
	it("leaves invalid base64 untouched", () => {
		expect(parse("{M.base64decode}", "M", "!!!not base64!!!")).toBe("!!!not base64!!!");
	});
});

describe("duration", () => {
	it("formats a long duration", () => {
		expect(parse("{N.duration}", "N", String(((25 * 60 + 12) * 60 + 30) * 1000))).toBe(
			"1d 1h 12m 30s",
		);
	});
	it("only shows seconds for a short duration", () => {
		expect(parse("{N.duration}", "N", "5000")).toBe("5s");
	});
	it("keeps the sign of a negative duration", () => {
		expect(parse("{N.duration}", "N", "-5000")).toBe("-5s");
	});
});

describe("ordinals without i18n fall back to english", () => {
	it.each([
		["1", "1st"],
		["2", "2nd"],
		["3", "3rd"],
		["4", "4th"],
		["11", "11th"],
		["21", "21st"],
	])("%s becomes %s", (value, expected) => {
		expect(parse("{N.ordinal}", "N", value)).toBe(expected);
	});
});

describe("ordinals follow the app language", () => {
	const ORDINALS: { [locale: string]: OrdinalLabels } = {
		en: { one: "#st", two: "#nd", few: "#rd", other: "#th" },
		fr: { one: "#er", other: "#e" },
	};
	//Replays what main.ts does on boot and on every language change
	function setLocale(locale: string): void {
		configureI18n(locale, ORDINALS[locale]);
	}

	beforeEach(() => setLocale("fr"));

	it("uses the french patterns", () => {
		expect(parse("{N.ordinal}", "N", "1")).toBe("1er");
		expect(parse("{N.ordinal}", "N", "2")).toBe("2e");
		expect(parse("{N.ordinal}", "N", "21")).toBe("21e");
	});
	it("takes a language change into account", () => {
		setLocale("en");
		expect(parse("{N.ordinal}", "N", "3")).toBe("3rd");
	});
	it("falls back to english on an unknown language", () => {
		setLocale("zz-ZZ");
		expect(parse("{N.ordinal}", "N", "1")).toBe("1st");
	});
	it("does not throw on a malformed language", () => {
		setLocale("not_a_locale!");
		expect(parse("{N.ordinal}", "N", "2")).toBe("2nd");
	});
	//The language still drives the plural category, only the patterns fall back
	it("falls back to the english patterns when none are given", () => {
		configureI18n("fr");
		expect(parse("{N.ordinal}", "N", "1")).toBe("1st");
	});
	it('falls back to the "other" pattern for a missing category', () => {
		configureI18n("en", { other: "#th" });
		expect(parse("{N.ordinal}", "N", "1")).toBe("1th");
	});
	it("still shows the number when a pattern has no # token", () => {
		configureI18n("en", { two: "nd", other: "th" });
		expect(parse("{N.ordinal}", "N", "2")).toBe("2nd");
	});
});

describe("numbers and dates follow the app language, not the system one", () => {
	beforeEach(() => configureI18n("en"));

	it("groups digits the english way", () => {
		expect(parse("{N.separator}", "N", "1234567")).toBe("1,234,567");
	});
	it("groups digits the french way", () => {
		configureI18n("fr");
		const res = parse("{N.separator}", "N", "1234567");
		expect(res).toMatch(/^1\s234\s567$/u);
		expect(res).not.toBe("1,234,567");
	});
	it("shortens large numbers per language", () => {
		expect(parse("{N.compact}", "N", "1234567")).toBe("1.2M");
		configureI18n("fr");
		expect(parse("{N.compact}", "N", "1234567")).toMatch(/^1,2\s*M/u);
	});
	it("formats money per language", () => {
		expect(parse("{N.currency(EUR)}", "N", "12.5")).toBe("€12.50");
		configureI18n("fr");
		expect(parse("{N.currency(EUR)}", "N", "12.5")).toMatch(/^12,50\s*€$/u);
	});
	it("gives the raw number for an unknown currency", () => {
		expect(parse("{N.currency(NOPE)}", "N", "12.5")).toBe("12.5");
	});
	const timestamp = String(Date.UTC(2026, 7, 6, 12, 0, 0));

	it("orders the date parts per language", () => {
		expect(parse("{N.date}", "N", timestamp)).toMatch(/^8\/6\/2026$/);
		configureI18n("fr");
		expect(parse("{N.date}", "N", timestamp)).toMatch(/^06\/08\/2026$/);
	});
	it("writes the time of the day per language", () => {
		expect(parse("{N.time}", "N", timestamp)).toMatch(/^\d{1,2}:\d{2}:00\s(AM|PM)$/i);
		configureI18n("fr");
		expect(parse("{N.time}", "N", timestamp)).toMatch(/^\d{2}:\d{2}:00$/);
	});
	it("datetime shows both the date and the time", () => {
		expect(parse("{N.datetime}", "N", timestamp)).toMatch(
			/^8\/6\/2026,\s\d{1,2}:\d{2}:00\s(AM|PM)$/i,
		);
		configureI18n("fr");
		expect(parse("{N.datetime}", "N", timestamp)).toMatch(/^06\/08\/2026\s\d{2}:\d{2}:00$/);
	});
	it("translates the relative time", () => {
		const twoHoursAgo = String(Date.now() - 2 * 3600000);
		expect(parse("{N.ago}", "N", twoHoursAgo)).toMatch(/hours ago/);
		configureI18n("fr");
		expect(parse("{N.ago}", "N", twoHoursAgo)).toMatch(/il y a/);
	});
	it("sorts using the language collation", () => {
		configureI18n("fr");
		expect(parse("{L.sort}", "L", "zebre, éclair, avion")).toBe("avion, éclair, zebre");
	});
	//The formatters are cached, the cache must be keyed by locale
	it("does not let the formatter cache hide a language change", () => {
		const english = parse("{N.separator}", "N", "1234567");
		configureI18n("fr");
		expect(parse("{N.separator}", "N", "1234567")).not.toBe(english);
		configureI18n("en");
		expect(parse("{N.separator}", "N", "1234567")).toBe(english);
	});
});

//Catches adding a modifier without testing it. Relies on what the tests
//above actually ran, so it must stay the last suite of the file and it
//only means something when the whole file runs
describe("modifier coverage", () => {
	it("runs every modifier at least once", () => {
		expect(getModifierNames().filter((name) => !executedModifiers.has(name))).toEqual([]);
	});
});

