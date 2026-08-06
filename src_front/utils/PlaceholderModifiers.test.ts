/**
 * Tests for the placeholder modifiers.
 *
 * Run with: npm test
 */

import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
	applyModifiers,
	getModifierNames,
	replacePlaceholder,
	setPlaceholderModifiersI18n,
	unescapeLiteralPlaceholders,
} from "./PlaceholderModifiers";

/**
 * Replays what TriggerActionHandler does: replaces the {TAG...} occurrences
 * by a value, running the modifiers of each occurrence on it.
 */
function parse(src: string, tag: string, value: string): string {
	return replacePlaceholder(src, tag, (modifiers) => applyModifiers(value, modifiers));
}

//The i18n provider is module wide, make sure a test never inherits
//the one set up by a previous test
beforeEach(() => setPlaceholderModifiersI18n(null));
afterAll(() => setPlaceholderModifiersI18n(null));

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
	it("mask", () => {
		expect(parse("{U.mask(3)}", "U", "Durss")).toBe("Dur**");
	});
	it("mention does not double an existing @", () => {
		expect(parse("{U.mention}", "U", "@Durss")).toBe("@Durss");
	});
	it("slug", () => {
		expect(parse("{T.slug}", "T", "Ma Super Émission !")).toBe("ma-super-emission");
	});
	it("initials", () => {
		expect(parse("{U.initials}", "U", "john doe")).toBe("JD");
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
	it("round", () => {
		expect(parse("{C.round(2)}", "C", "3.14159")).toBe("3.14");
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
	const ORDINALS: { [locale: string]: { [category: string]: string } } = {
		en: { one: "#st", two: "#nd", few: "#rd", other: "#th" },
		fr: { one: "#er", other: "#e" },
	};
	let locale = "fr";

	beforeEach(() => {
		locale = "fr";
		setPlaceholderModifiersI18n({
			getLocale: () => locale,
			getLabel: (key) => ORDINALS[locale]?.[key.split(".").pop() ?? ""],
		});
	});

	it("uses the french patterns", () => {
		expect(parse("{N.ordinal}", "N", "1")).toBe("1er");
		expect(parse("{N.ordinal}", "N", "2")).toBe("2e");
		expect(parse("{N.ordinal}", "N", "21")).toBe("21e");
	});
	it("takes a language change into account", () => {
		locale = "en";
		expect(parse("{N.ordinal}", "N", "3")).toBe("3rd");
	});
	it("falls back to english on an unknown language", () => {
		locale = "zz-ZZ";
		expect(parse("{N.ordinal}", "N", "1")).toBe("1st");
	});
	it("does not throw on a malformed language", () => {
		locale = "not_a_locale!";
		expect(parse("{N.ordinal}", "N", "2")).toBe("2nd");
	});
	it("still shows the number when a pattern has no # token", () => {
		setPlaceholderModifiersI18n({ getLocale: () => "en", getLabel: () => undefined });
		expect(parse("{N.ordinal}", "N", "2")).toBe("2nd");
	});
});

describe("numbers and dates follow the app language, not the system one", () => {
	let locale = "en";

	beforeEach(() => {
		locale = "en";
		setPlaceholderModifiersI18n({ getLocale: () => locale, getLabel: () => undefined });
	});

	it("groups digits the english way", () => {
		expect(parse("{N.separator}", "N", "1234567")).toBe("1,234,567");
	});
	it("groups digits the french way", () => {
		locale = "fr";
		const res = parse("{N.separator}", "N", "1234567");
		expect(res).toMatch(/^1\s234\s567$/u);
		expect(res).not.toBe("1,234,567");
	});
	it("shortens large numbers per language", () => {
		expect(parse("{N.compact}", "N", "1234567")).toBe("1.2M");
		locale = "fr";
		expect(parse("{N.compact}", "N", "1234567")).toMatch(/^1,2\s*M/u);
	});
	it("formats money per language", () => {
		expect(parse("{N.currency(EUR)}", "N", "12.5")).toBe("€12.50");
		locale = "fr";
		expect(parse("{N.currency(EUR)}", "N", "12.5")).toMatch(/^12,50\s*€$/u);
	});
	it("gives the raw number for an unknown currency", () => {
		expect(parse("{N.currency(NOPE)}", "N", "12.5")).toBe("12.5");
	});
	it("orders the date parts per language", () => {
		const timestamp = String(Date.UTC(2026, 7, 6, 12, 0, 0));
		expect(parse("{N.date}", "N", timestamp)).toMatch(/^8\/6\/2026$/);
		locale = "fr";
		expect(parse("{N.date}", "N", timestamp)).toMatch(/^06\/08\/2026$/);
	});
	it("translates the relative time", () => {
		const twoHoursAgo = String(Date.now() - 2 * 3600000);
		expect(parse("{N.ago}", "N", twoHoursAgo)).toMatch(/hours ago/);
		locale = "fr";
		expect(parse("{N.ago}", "N", twoHoursAgo)).toMatch(/il y a/);
	});
	it("sorts using the language collation", () => {
		locale = "fr";
		expect(parse("{L.sort}", "L", "zebre, éclair, avion")).toBe("avion, éclair, zebre");
	});
	//The formatters are cached, the cache must be keyed by locale
	it("does not let the formatter cache hide a language change", () => {
		const english = parse("{N.separator}", "N", "1234567");
		locale = "fr";
		expect(parse("{N.separator}", "N", "1234567")).not.toBe(english);
		locale = "en";
		expect(parse("{N.separator}", "N", "1234567")).toBe(english);
	});
});
