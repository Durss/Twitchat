import type { TriggerChatCommandCaptureData } from "@/types/TriggerActionDataTypes";

export type CapturePatternToken =
	| { type: "literal"; value: string }
	| { type: "tag"; tag: string; greedy: boolean };

export interface CaptureMatchResult {
	values: { [tag: string]: string };
}

export type CaptureValidationError =
	| "duplicate_tag"
	| "adjacent_greedy"
	| "invalid_regex"
	| "regex_too_long"
	| "no_tag";

/**
 * Compiles and executes chat command params extraction definitions.
 * Both "pattern" and "regex" modes end up as a regex with named capture
 * groups, pattern mode being compiled to two variants:
 * - "strict": the message must have the expected shape (extra words allowed)
 * - "tolerant": the message may stop anywhere within the pattern so a
 *   truncated message still fills the placeholders it reached, like the legacy
 *   1-word-per-param system did. It can never skip an element though, a
 *   message not matching the expected shape extracts nothing past that point
 *
 * Created : 05/08/2026
 */
export default class ChatCommandCaptureUtils {
	/**
	 * Max length of a hand written regex
	 */
	public static readonly MAX_REGEX_LENGTH: number = 1000;
	/**
	 * Max length of a regex compiled from a pattern.
	 * A pattern is ~6 times shorter than the regex it compiles to, this
	 * leaves enough room for the longest pattern the editor accepts.
	 */
	public static readonly MAX_COMPILED_LENGTH: number = 6000;

	private static regexCache: { [key: string]: RegExp | null } = {};

	/**
	 * Parses a capture pattern into literal and {TAG}/{TAG...} tokens
	 */
	public static parsePattern(pattern: string): CapturePatternToken[] {
		const tokens: CapturePatternToken[] = [];
		const reg = /\{([a-z0-9_]+)(\.\.\.)?\}/gi;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = reg.exec(pattern)) != null) {
			if (match.index > lastIndex) {
				tokens.push({ type: "literal", value: pattern.substring(lastIndex, match.index) });
			}
			tokens.push({
				type: "tag",
				tag: match[1]!.toUpperCase(),
				greedy: match[2] != undefined,
			});
			lastIndex = reg.lastIndex;
		}
		if (lastIndex < pattern.length) {
			tokens.push({ type: "literal", value: pattern.substring(lastIndex) });
		}
		return tokens;
	}

	/**
	 * Gets the placeholder tags defined on the given capture data.
	 * Parses {TAG} tokens in pattern mode and (?<TAG>...) named groups in regex mode.
	 */
	public static getTags(capture: TriggerChatCommandCaptureData): string[] {
		const tags: string[] = [];
		if (capture.mode == "regex") {
			const reg = /\(\?<([a-z0-9_$]+)>/gi;
			let match: RegExpExecArray | null;
			while ((match = reg.exec(capture.regex)) != null) {
				const tag = match[1]!.toUpperCase();
				if (!tags.includes(tag)) tags.push(tag);
			}
		} else {
			for (const token of this.parsePattern(capture.pattern)) {
				if (token.type == "tag" && !tags.includes(token.tag)) tags.push(token.tag);
			}
		}
		return tags;
	}

	/**
	 * Compiles a pattern to its "strict" and "tolerant" regex sources.
	 * The message is expected to be stripped from the chat command and trimmed.
	 */
	public static compilePattern(pattern: string): { strict: string; tolerant: string } {
		const tokens = this.parsePattern(pattern.trim());

		//Build strict source.
		//Whitespaces of the pattern are compiled to "\s+" so consecutive
		//spaces on the message don't matter
		let strict = "";
		let endsWithGreedy = false;
		for (const token of tokens) {
			if (token.type == "tag") {
				strict += token.greedy ? "(?<" + token.tag + ">.+)" : "(?<" + token.tag + ">\\S+)";
				endsWithGreedy = token.greedy;
			} else {
				strict += token.value
					.split(/(\s+)/)
					.map((chunk) => (/^\s+$/.test(chunk) ? "\\s+" : this.escapeRegex(chunk)))
					.join("");
				endsWithGreedy = false;
			}
		}
		//Allow extra words at the end of the message (legacy behavior ignored them)
		if (!endsWithGreedy) strict += "(?:\\s.*)?";
		strict = "^" + strict + "$";

		//Build tolerant source.
		//The pattern is split into space separated units
		const units: string[] = [];
		let unit = "";
		for (const token of tokens) {
			if (token.type == "tag") {
				unit += token.greedy ? "(?<" + token.tag + ">.+)" : "(?<" + token.tag + ">\\S+)";
			} else {
				const chunks = token.value.split(/\s+/);
				for (let i = 0; i < chunks.length; i++) {
					if (i > 0) {
						if (unit.length > 0) units.push(unit);
						unit = "";
					}
					unit += this.escapeRegex(chunks[i]!);
				}
			}
		}
		if (unit.length > 0) units.push(unit);
		//Units are nested into each other instead of being made optional one by
		//one, so the message can stop early but can't skip a unit it doesn't
		//match. Making them individually optional would extract values from a
		//message that doesn't follow the pattern at all
		let tolerant = "";
		for (let i = units.length - 1; i > 0; i--) {
			tolerant = "(?:\\s+" + units[i] + tolerant + ")?";
		}
		tolerant = "^" + (units[0] || "") + tolerant;

		return { strict, tolerant };
	}

	/**
	 * Executes the given capture on a message.
	 * The message is expected to be stripped from the chat command.
	 * Every tag defined on the capture is present on the values, defaulting
	 * to an empty string if it couldn't be extracted.
	 */
	public static match(
		capture: TriggerChatCommandCaptureData,
		message: string,
	): CaptureMatchResult {
		const values: { [tag: string]: string } = {};
		for (const tag of this.getTags(capture)) values[tag] = "";
		const result: CaptureMatchResult = { values };
		const text = message.trim();

		function applyGroups(execRes: RegExpExecArray): void {
			for (const key in execRes.groups) {
				values[key.toUpperCase()] = execRes.groups[key] ?? "";
			}
		}

		if (capture.mode == "regex") {
			const reg = this.getRegex(
				"regex_" + capture.regex,
				capture.regex,
				this.MAX_REGEX_LENGTH + 100,
			);
			const execRes = reg?.exec(text);
			if (execRes) {
				applyGroups(execRes);
			}
		} else {
			//Compiled sources are way longer than their pattern, they get their own
			//limit. They're safe whatever their length as we generated them
			const compiled = this.compilePattern(capture.pattern);
			const maxLength = this.MAX_COMPILED_LENGTH;
			const strict = this.getRegex("strict_" + capture.pattern, compiled.strict, maxLength);
			const tolerant = this.getRegex(
				"tolerant_" + capture.pattern,
				compiled.tolerant,
				maxLength,
			);
			let execRes = strict?.exec(text);
			if (execRes) {
				applyGroups(execRes);
			} else if ((execRes = tolerant?.exec(text))) {
				applyGroups(execRes);
			}
		}
		return result;
	}

	/**
	 * Validates the given capture data and returns the list of issues found
	 */
	public static validate(capture: TriggerChatCommandCaptureData): CaptureValidationError[] {
		const errors: CaptureValidationError[] = [];
		if (capture.mode == "regex") {
			const regex = capture.regex.trim();
			if (regex.length == 0) return errors;
			if (regex.length > this.MAX_REGEX_LENGTH) errors.push("regex_too_long");
			try {
				new RegExp(regex, "i");
			} catch {
				errors.push("invalid_regex");
			}
			if (!errors.length && this.getTags(capture).length == 0) errors.push("no_tag");
		} else {
			const tags: string[] = [];
			let prevWasGreedy = false;
			for (const token of this.parsePattern(capture.pattern.trim())) {
				if (token.type == "literal") {
					//Whitespace-only literals don't disambiguate two greedy tags
					if (!/^\s*$/.test(token.value)) prevWasGreedy = false;
					continue;
				}
				if (tags.includes(token.tag) && !errors.includes("duplicate_tag")) {
					errors.push("duplicate_tag");
				}
				tags.push(token.tag);
				if (token.greedy && prevWasGreedy && !errors.includes("adjacent_greedy")) {
					errors.push("adjacent_greedy");
				}
				prevWasGreedy = token.greedy;
			}
		}
		return errors;
	}

	/**
	 * Builds a regex from the given source with caching.
	 * Returns null if the source is invalid or longer than maxLength.
	 */
	private static getRegex(cacheKey: string, source: string, maxLength: number): RegExp | null {
		if (cacheKey in this.regexCache) return this.regexCache[cacheKey]!;
		//Avoid infinite growth if user spams edits
		if (Object.keys(this.regexCache).length > 200) this.regexCache = {};
		let reg: RegExp | null = null;
		if (source.length <= maxLength) {
			try {
				reg = new RegExp(source, "i");
			} catch {
				reg = null;
			}
		}
		this.regexCache[cacheKey] = reg;
		return reg;
	}

	private static escapeRegex(value: string): string {
		return value.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
	}
}
