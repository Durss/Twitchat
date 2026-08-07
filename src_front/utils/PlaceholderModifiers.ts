/**
 * Placeholder modifiers.
 *
 * Allows transforming a placeholder's value inline, ex: {USER.uppercase}
 * Modifiers can be chained and can take arguments:
 *   {MESSAGE.trim.truncate(50)}
 *   {COUNTER_POINTS.add(10).separator}
 *   {USER_ROLE_SUB.bool(sub, not a sub)}
 *
 * Arguments can be written bare, or quoted when they contain a comma,
 * a bracket, a brace or a quote:
 *   {MESSAGE.replace("a, b", "c")}
 * Within a quoted argument only \" is an escape, every other backslash is
 * kept as is so windows paths don't need to be doubled.
 *
 * This file must remain dependency free so it can also be used from the
 * super light label overlay (see overlayLabel.ts).
 *
 * Created : 06/08/2026
 */

export interface IPlaceholderModifier {
	name: string;
	args: string[];
}

interface IPlaceholderMatch {
	/** Index just after the closing brace */
	end: number;
	modifiers: IPlaceholderModifier[];
}

/**
 * Opening quote => expected closing quote.
 * Curly quotes are accepted because users copy/paste from Discord,
 * Word or their phone which silently replace straight quotes.
 */
const QUOTES: { [open: string]: string } = {
	'"': '"',
	"'": "'",
	"“": "”",
	"”": "”",
	"‘": "’",
	"’": "’",
};

const MODIFIER_NAME_CHARS = /[A-Za-z0-9_]/;

/*******************
 * PUBLIC METHODS  *
 *******************/

/**
 * Replaces every {TAG} and {TAG.modifier(...)} occurrence of the given tag.
 *
 * The resolver receives the parsed modifiers of that specific occurrence so
 * the same tag can be used multiple times with different modifiers.
 * {{TAG}} is left untouched, it's the escape sequence for a literal {TAG}.
 *
 * Anything malformed is left untouched rather than throwing, a trigger
 * should never break because of a typo in a placeholder.
 */
export function replacePlaceholder(
	src: string,
	tag: string,
	resolver: (modifiers: IPlaceholderModifier[]) => string,
): string {
	const tagU = tag.toUpperCase();
	const chunks: string[] = [];
	let last = 0;
	let i = 0;
	while (i < src.length) {
		const open = src.indexOf("{", i);
		if (open === -1) break;
		const match = matchPlaceholder(src, open, tagU);
		if (!match) {
			i = open + 1;
			continue;
		}
		//{{TAG}} => escaped, leave it for unescapeLiteralPlaceholders()
		if (src[open - 1] === "{" && src[match.end] === "}") {
			i = match.end + 1;
			continue;
		}
		chunks.push(src.slice(last, open), resolver(match.modifiers));
		last = match.end;
		i = match.end;
	}
	//Nothing matched, don't build a new string for nothing
	if (chunks.length === 0) return src;
	chunks.push(src.slice(last));
	return chunks.join("");
}

/**
 * Applies a modifier chain to a value.
 * Unknown modifiers are ignored so a typo doesn't wipe out the value.
 */
export function applyModifiers(value: string, modifiers: IPlaceholderModifier[]): string {
	let res = value;
	for (const modifier of modifiers) {
		const handler = MODIFIERS[modifier.name];
		if (!handler) continue;
		try {
			res = handler(res, modifier.args);
		} catch (_error) {
			/* keep the previous value on failure */
		}
	}
	return res;
}

/**
 * Converts the {{TAG}} escape sequences to literal {TAG}.
 * Must be called once all placeholders have been replaced.
 *
 * Only tag shaped contents are unescaped so JSON payloads and
 * "{{ mustache }}" style templates are left alone.
 */
export function unescapeLiteralPlaceholders(src: string): string {
	return src.replace(/\{\{([A-Z0-9_]+(?:\.[^{}]*)?)\}\}/gi, "{$1}");
}

/**
 * Replaces a whole set of placeholders in one go.
 *
 * Convenience wrapper for the numerous places replacing a handful of
 * fixed tags by hand with text.replace(/\{TAG\}/gi, value). Going
 * through here gives them the modifiers, the {{TAG}} escape and the
 * case insensitive matching for free.
 *
 * Values are replaced in the order of the given object. As with a
 * chain of replace() calls, a value holding a placeholder of its own
 * can be picked up by the tags processed after it.
 */
export function replacePlaceholders(
	src: string,
	values: { [tag: string]: string | number | null | undefined },
): string {
	if (!src) return src;
	let res = src;
	for (const tag in values) {
		const value = (values[tag] ?? "").toString();
		res = replacePlaceholder(res, tag, (modifiers) => applyModifiers(value, modifiers));
	}
	return unescapeLiteralPlaceholders(res);
}

/**
 * Name of every available modifier. Mostly useful to build the UI.
 */
export function getModifierNames(): string[] {
	return Object.keys(MODIFIERS);
}

/**
 * Localization of the modifiers producing words rather than raw values.
 * Injected instead of imported so this file stays dependency free and
 * still works from the label overlay, which has no i18n at all.
 */
export interface IPlaceholderModifiersI18n {
	/**
	 * Current locale, ex: "en" or "fr"
	 */
	getLocale: () => string;
	/**
	 * Translates a label key. Must return undefined when the key is missing
	 * so the built-in english fallbacks can kick in.
	 */
	getLabel: (key: string) => string | undefined;
}

let i18nProvider: IPlaceholderModifiersI18n | null = null;

/**
 * Plugs the app's i18n into the modifiers.
 * When omitted, everything falls back to english.
 */
export function setPlaceholderModifiersI18n(provider: IPlaceholderModifiersI18n | null): void {
	i18nProvider = provider;
}

/*******************
 * PARSING         *
 *******************/

/**
 * Case insensitive comparison of a tag against a position of the source.
 *
 * Done by char code rather than with substr().toUpperCase() because this
 * runs for every "{" of every parsed text, and allocating two strings
 * each time shows up on big texts. Tags only contain A-Z, 0-9 and "_"
 * so plain ASCII upper casing is enough.
 */
function matchesTagAt(src: string, at: number, tagU: string): boolean {
	if (at + tagU.length > src.length) return false;
	for (let i = 0; i < tagU.length; i++) {
		let code = src.charCodeAt(at + i);
		if (code >= 97 && code <= 122) code -= 32; //Efficient uppercase
		if (code !== tagU.charCodeAt(i)) return false;
	}
	return true;
}

/**
 * Tries to match "{TAG}" or "{TAG.modifier(...)}" at the given index
 */
function matchPlaceholder(src: string, open: number, tagU: string): IPlaceholderMatch | null {
	if (!matchesTagAt(src, open + 1, tagU)) return null;
	let p = open + 1 + tagU.length;
	if (src[p] === "}") return { end: p + 1, modifiers: [] };
	if (src[p] !== ".") return null;

	const modifiers: IPlaceholderModifier[] = [];
	while (src[p] === ".") {
		p++;
		const nameStart = p;
		while (p < src.length && MODIFIER_NAME_CHARS.test(src[p]!)) p++;
		if (p === nameStart) return null;
		const name = src.slice(nameStart, p).toLowerCase();
		let args: string[] = [];
		if (src[p] === "(") {
			const parsed = parseArguments(src, p);
			if (!parsed) return null;
			args = parsed.args;
			p = parsed.end;
		}
		modifiers.push({ name, args });
	}
	if (src[p] !== "}") return null;
	return { end: p + 1, modifiers };
}

/**
 * Parses "(arg, "arg", ...)" starting at the opening parenthesis
 */
function parseArguments(src: string, p: number): { args: string[]; end: number } | null {
	p++; //skip "("
	const args: string[] = [];
	for (;;) {
		while (src[p] === " " || src[p] === "\t") p++;
		if (p >= src.length) return null;
		if (src[p] === ")") {
			p++;
			break;
		}

		const closingQuote = QUOTES[src[p]!];
		if (closingQuote) {
			//Quoted argument. Commas, brackets and braces are litteral in there.
			p++;
			let buffer = "";
			while (p < src.length && src[p] !== closingQuote) {
				if (src[p] === "\\" && (src[p + 1] === closingQuote || src[p + 1] === "\\")) {
					buffer += src[p + 1];
					p += 2;
					continue;
				}
				buffer += src[p];
				p++;
			}
			if (p >= src.length) return null; //unterminated string
			p++; //skip closing quote
			args.push(buffer);
			while (src[p] === " " || src[p] === "\t") p++;
		} else {
			//Bare argument, stops on the first "," or ")"
			const start = p;
			while (p < src.length && src[p] !== "," && src[p] !== ")" && src[p] !== "}") p++;
			if (p >= src.length || src[p] === "}") return null;
			args.push(src.slice(start, p).trim());
		}

		if (src[p] === ",") {
			p++;
			continue;
		}
		if (src[p] === ")") {
			p++;
			break;
		}
		return null;
	}
	return { args, end: p };
}

/*******************
 * HELPERS         *
 *******************/

/**
 * Intl objects are expensive to build (15 to 30µs each) and these
 * modifiers run on every parsed text, so they're built once and reused.
 * Keyed by locale as the user can change the app's language on the fly.
 */
const intlCache: { [key: string]: unknown } = {};
function cachedIntl<T>(key: string, factory: () => T): T {
	let res = intlCache[key] as T | undefined;
	if (res === undefined) {
		res = factory();
		intlCache[key] = res;
	}
	return res;
}

/**
 * Locale everything must be formatted with.
 *
 * This is the language selected within Twitchat, NOT the one of the
 * browser or the OS, so a french user on an english system gets
 * french dates and numbers.
 * Returns undefined when i18n isn't plugged in, which only happens on
 * the label overlay, where falling back to the system locale is the
 * only sensible option.
 */
function currentLocale(): string | undefined {
	return i18nProvider?.getLocale() || undefined;
}

/**
 * Builds and caches an Intl formatter for the current locale.
 * Cached per locale so switching Twitchat's language takes effect
 * immediately. A locale Intl refuses falls back to the system one.
 */
function localizedIntl<T>(kind: string, factory: (locale: string | undefined) => T): T {
	const locale = currentLocale();
	const key = kind + "@" + (locale ?? "");
	let res = intlCache[key] as T | undefined;
	if (res === undefined) {
		try {
			res = factory(locale);
		} catch (_error) {
			res = factory(undefined);
		}
		intlCache[key] = res;
	}
	return res;
}

/**
 * Splits a string into user perceived characters.
 * Necessary so emojis and accented chars aren't broken in half when
 * reversing or truncating a value.
 */
function toGraphemes(value: string): string[] {
	//Segmenting is much slower than a plain split and most values are
	//plain ASCII, where one char is always one grapheme.
	//Use plain split if there is no exotic char
	if (!/[\u0080-\uffff]/.test(value)) return value.split("");

	const segmenter = cachedIntl(
		"segmenter",
		() => new Intl.Segmenter(undefined, { granularity: "grapheme" }),
	);
	const res: string[] = [];
	for (const chunk of segmenter.segment(value)) res.push(chunk.segment);
	return res;
}

function toNumber(value: string): number | null {
	const res = parseFloat(value.trim());
	return isNaN(res) ? null : res;
}

/**
 * Ordinal patterns used when no i18n provider is plugged in, or when the
 * locale doesn't define a pattern for one of the plural categories.
 * "#" is where the number goes, so languages placing the marker before
 * the number are supported too.
 */
const DEFAULT_ORDINAL_PATTERNS: { [category: string]: string } = {
	one: "#st",
	two: "#nd",
	few: "#rd",
	other: "#th",
};

/**
 * Ordinal pattern of a number for the current locale.
 * ex: 1 => "#st" in english, "#er" in french
 *
 * Intl gives us the plural category of the number for the locale
 * ("one", "two", "few"...), the matching pattern is then translated.
 */
function getOrdinalLabel(value: number): string {
	const locale = i18nProvider?.getLocale() || "en";
	let category: string;
	try {
		category = cachedIntl(
			"ordinal:" + locale,
			() => new Intl.PluralRules(locale, { type: "ordinal" }),
		).select(value);
	} catch (_error) {
		//Unknown locale, fall back to the english rules
		category = cachedIntl(
			"ordinal:en",
			() => new Intl.PluralRules("en", { type: "ordinal" }),
		).select(value);
	}
	return (
		i18nProvider?.getLabel("global.ordinal." + category) ??
		i18nProvider?.getLabel("global.ordinal.other") ??
		DEFAULT_ORDINAL_PATTERNS[category] ??
		DEFAULT_ORDINAL_PATTERNS["other"]!
	);
}

/**
 * Injects a number into an ordinal pattern.
 * Patterns without the "#" token are treated as plain suffixes so a
 * translator forgetting it doesn't make the number disappear.
 */
function formatOrdinal(value: number): string {
	const pattern = getOrdinalLabel(value);
	const num = numberToString(value);
	return pattern.includes("#") ? pattern.replace("#", num) : num + pattern;
}

/**
 * Stringifies a number without the usual floating point noise
 * ex: 0.1+0.2 => "0.3" instead of "0.30000000000000004"
 */
function numberToString(value: number): string {
	if (!isFinite(value)) return "0";
	return String(Math.round(value * 1e10) / 1e10);
}

/**
 * Builds a modifier working on the numeric value.
 * Non numeric values are returned untouched.
 */
function numeric(handler: (value: number, args: string[]) => number | string): PlaceholderModifier {
	return (value, args) => {
		const num = toNumber(value);
		if (num === null) return value;
		const res = handler(num, args);
		return typeof res === "number" ? numberToString(res) : res;
	};
}

function argToNumber(arg: string | undefined, fallback: number): number {
	if (arg === undefined) return fallback;
	const res = parseFloat(arg.trim());
	return isNaN(res) ? fallback : res;
}

/**
 * Most list-ish placeholders are exposed as coma separated strings
 */
function toList(value: string): string[] {
	return value
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
}

function formatDuration(millis: number): string {
	const negative = millis < 0;
	const abs = Math.abs(millis);
	const seconds = Math.floor(abs / 1000) % 60;
	const minutes = Math.floor(abs / 60000) % 60;
	const hours = Math.floor(abs / 3600000) % 24;
	const days = Math.floor(abs / 86400000);
	const chunks: string[] = [];
	if (days > 0) chunks.push(days + "d");
	if (hours > 0 || days > 0) chunks.push(hours + "h");
	if (minutes > 0 || hours > 0 || days > 0) chunks.push(minutes + "m");
	chunks.push(seconds + "s");
	return (negative ? "-" : "") + chunks.join(" ");
}

function toBase64(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
	return btoa(binary);
}

function fromBase64(value: string): string {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

/*******************
 * MODIFIERS       *
 *******************/

export type PlaceholderModifier = (value: string, args: string[]) => string;

const MODIFIERS: { [name: string]: PlaceholderModifier } = {
	//#region Text
	/**
	 * Converts the value to upper case.
	 * @example {USER.uppercase} => DURSS
	 */
	uppercase: (v) => v.toUpperCase(),
	/**
	 * @alias uppercase
	 */
	upper: (v) => v.toUpperCase(),
	/**
	 * Converts the value to lower case.
	 * @example {USER.lowercase} => durss
	 */
	lowercase: (v) => v.toLowerCase(),
	/**
	 * @alias lowercase
	 */
	lower: (v) => v.toLowerCase(),
	/**
	 * Upper cases the first character. The rest of the value is left
	 * untouched so names like "McDonald" aren't mangled.
	 * @example {USER.capitalize} => Durss
	 */
	capitalize: (v) => (v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v),
	/**
	 * Upper cases the first character of every word.
	 * The rest of each word is left untouched.
	 * @example {TITLE.titlecase} => Hello World
	 */
	titlecase: (v) => v.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)),
	/**
	 * Removes the spaces before and after the value.
	 * @example {MESSAGE.trim} => "hello"
	 */
	trim: (v) => v.trim(),
	/**
	 * Removes every space of the value, not just the surrounding ones.
	 * @example {USER.nospace} => JohnDoe
	 */
	nospace: (v) => v.replace(/\s+/g, ""),
	/**
	 * Reverses the value. Emojis and accented characters are kept whole.
	 * @example {USER.reverse} => ssruD
	 */
	reverse: (v) => toGraphemes(v).reverse().join(""),
	/**
	 * Number of characters of the value. An emoji counts as one character.
	 * @example {MESSAGE.length} => 12
	 */
	length: (v) => toGraphemes(v).length.toString(),
	/**
	 * Repeats the value.
	 * @param count How many times to repeat it. Defaults to 1, capped at 100.
	 * @example {EMOTE.repeat(3)} => KappaKappaKappa
	 */
	repeat: (v, a) => v.repeat(Math.max(0, Math.min(100, argToNumber(a[0], 1)))),
	/**
	 * Shortens the value when it's too long and appends an ellipsis.
	 * Shorter values are returned untouched, without the ellipsis.
	 * @param size Maximum number of characters. Defaults to 50.
	 * @param ellipsis Appended when the value gets cut. Defaults to "…".
	 * @example {MESSAGE.truncate(10)} => Hello worl…
	 * @example {MESSAGE.truncate(10, " [...]")} => Hello worl [...]
	 */
	truncate: (v, a) => {
		const max = Math.max(0, argToNumber(a[0], 50));
		const ellipsis = a[1] ?? "…";
		const chars = toGraphemes(v);
		return chars.length <= max ? v : chars.slice(0, max).join("") + ellipsis;
	},
	/**
	 * Keeps only the first characters of the value.
	 * @param count How many characters to keep. Defaults to 0.
	 * @example {USER.left(3)} => Dur
	 */
	left: (v, a) =>
		toGraphemes(v)
			.slice(0, Math.max(0, argToNumber(a[0], 0)))
			.join(""),
	/**
	 * Keeps only the last characters of the value.
	 * @param count How many characters to keep. Defaults to 0.
	 * @example {USER.right(3)} => rss
	 */
	right: (v, a) => {
		const count = Math.max(0, argToNumber(a[0], 0));
		return count === 0 ? "" : toGraphemes(v).slice(-count).join("");
	},
	/**
	 * Pads the start of the value until it reaches the requested size.
	 * Handy to align values on an overlay.
	 * @param size Size to reach. Defaults to 0.
	 * @param char Character to pad with. Defaults to a space.
	 * @example {SCORE.padstart(5, 0)} => 00042
	 */
	padstart: (v, a) => v.padStart(Math.max(0, argToNumber(a[0], 0)), a[1] || " "),
	/**
	 * Pads the end of the value until it reaches the requested size.
	 * @param size Size to reach. Defaults to 0.
	 * @param char Character to pad with. Defaults to a space.
	 * @example {USER.padend(10, .)} => Durss.....
	 */
	padend: (v, a) => v.padEnd(Math.max(0, argToNumber(a[0], 0)), a[1] || " "),
	/**
	 * Replaces every occurrence of a text by another one.
	 * This is a plain text search, not a regular expression.
	 * @param search Text to search for. The value is untouched when empty.
	 * @param replacement Text to replace it with. Defaults to an empty text.
	 * @example {MESSAGE.replace(hello, hi)} => hi world
	 */
	replace: (v, a) => (a[0] ? v.split(a[0]).join(a[1] ?? "") : v),
	/**
	 * Removes every occurrence of a text.
	 * @param search Text to remove. The value is untouched when empty.
	 * @example {MESSAGE.remove(spoiler)} => " alert"
	 */
	remove: (v, a) => (a[0] ? v.split(a[0]).join("") : v),
	/**
	 * Keeps the first letter of every word, upper cased.
	 * @example {USER.initials} => JD
	 */
	initials: (v) =>
		v
			.split(/\s+/)
			.filter((w) => w.length > 0)
			.map((w) => w.charAt(0).toUpperCase())
			.join(""),
	/**
	 * Removes the accents of the value.
	 * Mostly useful to make a value easier to read for a text to speech.
	 * @example {USER.deaccent} => Francois
	 */
	deaccent: (v) => v.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
	/**
	 * Removes every emoji of the value.
	 * Strips pictographs along with the variation selector and zero width joiner.
	 * @example {MESSAGE.stripemoji} => hello
	 */
	stripemoji: (v) => v.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim(),
	/**
	 * Removes the HTML tags of the value.
	 * @example {MESSAGE.striphtml} => hello
	 */
	striphtml: (v) => v.replace(/<[^>]*>/g, ""),
	/**
	 * Removes every link of the value.
	 * @example {MESSAGE.nourl} => check this
	 */
	nourl: (v) =>
		v
			.replace(
				/((?:(?:http|ftp|https):\/\/)?(?:[\w_-]+(?:(?:\.[\w_-]+)+))(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/gi,
				"",
			)
			.trim(),
	/**
	 * Converts the value to a URL friendly text.
	 * Accents are removed and anything that isn't a letter or a
	 * digit becomes a dash.
	 * @example {TITLE.slug} => my-stream-title
	 */
	slug: (v) =>
		v
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, ""),
	/**
	 * Alternates the case of every character, sPoNgEbOb style.
	 * @example {MESSAGE.mock} => hElLo
	 */
	mock: (v) =>
		toGraphemes(v)
			.map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
			.join(""),
	/**
	 * Hides the end of the value behind a repeated character.
	 * @param keep How many characters to leave visible. Defaults to 0,
	 * which hides everything.
	 * @param char Character to hide behind. Defaults to "*".
	 * @example {USER.mask(3)} => Dur**
	 * @example {USER.mask(2, ?)} => Du???
	 */
	mask: (v, a) => {
		const keep = Math.max(0, argToNumber(a[0], 0));
		const char = a[1] || "*";
		const chars = toGraphemes(v);
		return chars.slice(0, keep).join("") + char.repeat(Math.max(0, chars.length - keep));
	},
	//#endregion

	//#region Numbers
	/**
	 * Rounds the number to the closest value.
	 * @param decimals How many decimals to keep. Defaults to 0.
	 * @example {AMOUNT.round} => 3
	 * @example {AMOUNT.round(2)} => 3.14
	 */
	round: numeric((n, a) => {
		const decimals = Math.max(0, argToNumber(a[0], 0));
		const factor = Math.pow(10, decimals);
		return Math.round(n * factor) / factor;
	}),
	/**
	 * Rounds the number down.
	 * @example {AMOUNT.floor} => 3
	 */
	floor: numeric((n) => Math.floor(n)),
	/**
	 * Rounds the number up.
	 * @example {AMOUNT.ceil} => 4
	 */
	ceil: numeric((n) => Math.ceil(n)),
	/**
	 * Removes the sign of the number.
	 * @example {AMOUNT.abs} => 42
	 */
	abs: numeric((n) => Math.abs(n)),
	/**
	 * Adds a number to the value.
	 * @param amount Number to add. Defaults to 0.
	 * @example {COUNTER_POINTS.add(10)} => 15
	 */
	add: numeric((n, a) => n + argToNumber(a[0], 0)),
	/**
	 * Subtracts a number from the value.
	 * @param amount Number to subtract. Defaults to 0.
	 * @example {COUNTER_POINTS.sub(10)} => 5
	 */
	sub: numeric((n, a) => n - argToNumber(a[0], 0)),
	/**
	 * Multiplies the value by a number.
	 * @param amount Number to multiply by. Defaults to 1.
	 * @example {COUNTER_POINTS.mul(2)} => 30
	 */
	mul: numeric((n, a) => n * argToNumber(a[0], 1)),
	/**
	 * Divides the value by a number.
	 * Dividing by 0 gives 0 rather than an error.
	 * @param amount Number to divide by. Defaults to 1.
	 * @example {COUNTER_POINTS.div(2)} => 7.5
	 */
	div: numeric((n, a) => {
		const by = argToNumber(a[0], 1);
		return by === 0 ? 0 : n / by;
	}),
	/**
	 * Returns the smallest of the value and the given limit, which
	 * effectively caps the value to that limit.
	 * @param limit Highest value that can come out.
	 * @example {VIEWERS.min(100)} => 100 when there are 250 viewers
	 */
	min: numeric((n, a) => Math.min(n, argToNumber(a[0], n))),
	/**
	 * Returns the largest of the value and the given limit, which
	 * effectively raises the value up to that limit.
	 * @param limit Lowest value that can come out.
	 * @example {VIEWERS.max(10)} => 10 when there are 3 viewers
	 */
	max: numeric((n, a) => Math.max(n, argToNumber(a[0], n))),
	/**
	 * Keeps the value between two limits.
	 * @param min Lowest value that can come out.
	 * @param max Highest value that can come out.
	 * @example {VIEWERS.clamp(1, 100)} => 100 when there are 250 viewers
	 */
	clamp: numeric((n, a) => Math.min(Math.max(n, argToNumber(a[0], n)), argToNumber(a[1], n))),
	/**
	 * Forces a fixed number of decimals, adding trailing zeros if needed.
	 * @param count How many decimals to show. Defaults to 0, capped at 20.
	 * @example {AMOUNT.decimals(2)} => 5.00
	 */
	decimals: numeric((n, a) => n.toFixed(Math.max(0, Math.min(20, argToNumber(a[0], 0))))),
	/**
	 * Always shows the sign of the number, including the "+" of positives.
	 * @example {DELTA.sign} => +5
	 */
	sign: numeric((n) => (n > 0 ? "+" : "") + numberToString(n)),
	/**
	 * Groups the digits of large numbers the way the current language does.
	 * @example {FOLLOWERS.separator} => 1,234,567
	 */
	separator: numeric((n) =>
		localizedIntl("separator", (locale) => new Intl.NumberFormat(locale)).format(n),
	),
	/**
	 * Shortens large numbers. Great for follower or viewer counts.
	 * @example {FOLLOWERS.compact} => 1.2M
	 */
	compact: numeric((n) =>
		localizedIntl(
			"compact",
			(locale) =>
				new Intl.NumberFormat(locale, {
					notation: "compact",
					maximumFractionDigits: 1,
				}),
		).format(n),
	),
	/**
	 * Formats the number as an amount of money, the way the current
	 * language does. An unknown currency code gives the raw number back.
	 * @param code Currency code, ex: EUR, USD, GBP. Defaults to USD.
	 * @example {AMOUNT.currency(EUR)} => €12.50
	 */
	currency: numeric((n, a) => {
		const code = (a[0] || "USD").toUpperCase();
		try {
			return localizedIntl(
				"currency:" + code,
				(locale) => new Intl.NumberFormat(locale, { style: "currency", currency: code }),
			).format(n);
		} catch (_error) {
			return numberToString(n);
		}
	}),
	/**
	 * Turns the number into a rank, translated to the current language.
	 * @example {RANK.ordinal} => 1st in english, 1er in french
	 */
	ordinal: numeric((n) => formatOrdinal(n)),
	/**
	 * Converts the value to a percentage of a total.
	 * The "%" sign isn't added so the result can be chained with
	 * another modifier such as round.
	 * @param total Value representing 100%. Defaults to 100.
	 * @example {COUNTER_DONE.percent(50).round} => 40
	 */
	percent: numeric((n, a) => {
		const total = argToNumber(a[0], 100);
		return total === 0 ? 0 : (n / total) * 100;
	}),
	//#endregion

	//#region Date & duration
	/**
	 * Converts a number of milliseconds to a readable duration.
	 * Only the units that are actually needed are shown, seconds always are.
	 * @example {USER_FOLLOWAGE_MS.duration} => 1d 4h 12m 30s
	 */
	duration: numeric((n) => formatDuration(n)),
	/**
	 * Converts a timestamp to a date, written the way the current
	 * language does.
	 * @example {DATE_NOW.date} => 8/6/2026
	 */
	date: numeric((n) =>
		localizedIntl("date", (locale) => new Intl.DateTimeFormat(locale)).format(new Date(n)),
	),
	/**
	 * Converts a timestamp to a time of the day, written the way the
	 * current language does.
	 * @example {DATE_NOW.time} => 4:35:02 PM
	 */
	time: numeric((n) =>
		localizedIntl(
			"time",
			(locale) =>
				new Intl.DateTimeFormat(locale, {
					hour: "numeric",
					minute: "numeric",
					second: "numeric",
				}),
		).format(new Date(n)),
	),
	/**
	 * Converts a timestamp to a date and a time, written the way the
	 * current language does.
	 * @example {DATE_NOW.datetime} => 8/6/2026, 4:35:02 PM
	 */
	datetime: numeric((n) =>
		localizedIntl(
			"datetime",
			(locale) =>
				new Intl.DateTimeFormat(locale, {
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
					second: "numeric",
				}),
		).format(new Date(n)),
	),
	/**
	 * Converts a timestamp to how long ago it was, translated to the
	 * current language. Future dates are supported too.
	 * @example {USER_FOLLOWAGE.ago} => 2 years ago
	 */
	ago: numeric((n) => {
		const diff = n - Date.now();
		const units: [Intl.RelativeTimeFormatUnit, number][] = [
			["year", 31536000000],
			["month", 2592000000],
			["day", 86400000],
			["hour", 3600000],
			["minute", 60000],
			["second", 1000],
		];
		const formatter = localizedIntl(
			"relativetime",
			(locale) => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
		);
		for (const [unit, ms] of units) {
			if (Math.abs(diff) >= ms || unit === "second") {
				return formatter.format(Math.round(diff / ms), unit);
			}
		}
		return numberToString(n);
	}),
	//#endregion

	//#region Lists
	//Most list-ish placeholders are exposed as coma separated values
	/**
	 * First entry of a coma separated value.
	 * @example {RAFFLE_WINNERS.first} => Alice
	 */
	first: (v) => toList(v)[0] ?? "",
	/**
	 * Last entry of a coma separated value.
	 * @example {RAFFLE_WINNERS.last} => Chloe
	 */
	last: (v) => toList(v).slice(-1)[0] ?? "",
	/**
	 * One specific entry of a coma separated value.
	 * @param index Position of the entry, starting at 1. Defaults to 1.
	 * @example {RAFFLE_WINNERS.nth(2)} => Bob
	 */
	nth: (v, a) => toList(v)[Math.max(1, argToNumber(a[0], 1)) - 1] ?? "",
	/**
	 * How many entries a coma separated value holds.
	 * @example {RAFFLE_WINNERS.count} => 3
	 */
	count: (v) => toList(v).length.toString(),
	/**
	 * Rewrites a coma separated value with another separator.
	 * @param separator Text placed between the entries. Defaults to ", ".
	 * @example {RAFFLE_WINNERS.join(" | ")} => Alice | Bob | Chloe
	 */
	join: (v, a) => toList(v).join(a[0] ?? ", "),
	/**
	 * Sorts the entries of a coma separated value alphabetically.
	 * @example {RAFFLE_WINNERS.sort} => Alice, Bob, Chloe
	 */
	sort: (v) =>
		toList(v)
			.sort((x, y) => x.localeCompare(y, currentLocale()))
			.join(", "),
	/**
	 * Removes the duplicated entries of a coma separated value.
	 * @example {CHATTERS.unique} => Alice, Bob
	 */
	unique: (v) => [...new Set(toList(v))].join(", "),
	/**
	 * Randomizes the order of the entries of a coma separated value.
	 * @example {CHATTERS.shuffle} => Bob, Chloe, Alice
	 */
	shuffle: (v) => {
		const list = toList(v);
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[list[i], list[j]] = [list[j]!, list[i]!];
		}
		return list.join(", ");
	},
	/**
	 * Cuts the value on a separator and keeps one of the chunks.
	 * Unlike the other list modifiers this one works with any separator.
	 * @param separator Text to cut the value on. Defaults to ",".
	 * @param index Position of the chunk to keep, starting at 1. Defaults to 1.
	 * @example {MESSAGE.split(" ", 2)} => world
	 */
	split: (v, a) => {
		const chunks = v.split(a[0] ?? ",");
		return chunks[Math.max(1, argToNumber(a[1], 1)) - 1]?.trim() ?? "";
	},
	//#endregion

	//#region Logic
	/**
	 * Replaces the value by a fallback when it's empty.
	 * Saves having to add a condition to the trigger.
	 * @param fallback Text used when the value is empty. Defaults to an empty text.
	 * @example {USER.default(someone)} => someone
	 */
	default: (v, a) => (v.trim().length > 0 ? v : (a[0] ?? "")),
	/**
	 * Converts a true/false value to your own words.
	 * "true", "1", "yes" and "on" all count as true, anything else is false.
	 * @param ifTrue Text used when the value is true.
	 * @param ifFalse Text used when the value is false.
	 * @example {USER_ROLE_SUB.bool(is a sub, is not a sub)} => is a sub
	 */
	bool: (v, a) => (/^(true|1|yes|on)$/i.test(v.trim()) ? (a[0] ?? "") : (a[1] ?? "")),
	/**
	 * Picks the singular or the plural word matching the number.
	 * The value itself is replaced by the word, so write the number
	 * next to it. A value that isn't a number counts as 0.
	 * @param singular Word used when the value is 1 or -1.
	 * @param plural Word used otherwise.
	 * @param zero Optional word used when the value is exactly 0.
	 * @example {VIEWERS} {VIEWERS.plural(viewer, viewers)} => 5 viewers
	 * @example {VIEWERS.plural(viewer, viewers, nobody)} => nobody
	 */
	plural: (v, a) => {
		const num = toNumber(v) ?? 0;
		if (num === 0 && a[2] !== undefined) return a[2];
		return Math.abs(num) === 1 ? (a[0] ?? "") : (a[1] ?? "");
	},
	/**
	 * Compares the value to a text and picks one of two outcomes.
	 * The comparison ignores the case and the surrounding spaces.
	 * @param compareTo Text to compare the value to.
	 * @param ifEqual Text used when both match.
	 * @param ifDifferent Text used otherwise. Defaults to the value itself.
	 * @example {MONTHS.equals(1, 1st time sub, resub)} => 1st time sub
	 */
	equals: (v, a) =>
		v.trim().toLowerCase() === (a[0] ?? "").trim().toLowerCase() ? (a[1] ?? "") : (a[2] ?? v),
	//#endregion

	//#region Encoding
	/**
	 * Makes the value safe to put inside a URL.
	 * @example {MESSAGE.urlencode} => hello%20world
	 */
	urlencode: (v) => encodeURIComponent(v),
	/**
	 * Reverts an URL encoded value. Invalid values are left untouched.
	 * @example {PARAM.urldecode} => hello world
	 */
	urldecode: (v) => {
		try {
			return decodeURIComponent(v);
		} catch (_error) {
			return v;
		}
	},
	/**
	 * Makes the value safe to put inside a JSON text.
	 * The surrounding quotes aren't added.
	 * Note that the HTTP and websocket trigger actions already do this
	 * for you, this is only needed when building JSON by hand elsewhere.
	 * @example {MESSAGE.jsonescape} => he said \"hi\"
	 */
	jsonescape: (v) => JSON.stringify(v).slice(1, -1),
	/**
	 * Makes the value safe to put inside HTML.
	 * @example {MESSAGE.htmlescape} => &lt;b&gt;hi&lt;/b&gt;
	 */
	htmlescape: (v) =>
		v
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;"),
	/**
	 * Encodes the value to base 64.
	 * @example {MESSAGE.base64} => aGVsbG8=
	 */
	base64: (v) => toBase64(v),
	/**
	 * Decodes a base 64 value. Invalid values are left untouched.
	 * @example {PAYLOAD.base64decode} => hello
	 */
	base64decode: (v) => {
		try {
			return fromBase64(v);
		} catch (_error) {
			return v;
		}
	},
	//#endregion
};
