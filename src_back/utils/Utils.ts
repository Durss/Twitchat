import * as crypto from "crypto";
import * as fs from "fs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import Config from "./Config.js";
import Logger from "./Logger.js";

/**
 * Created : 20/07/2023
 */
export default class Utils {
	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			//Node has a upper limit of 2147483647 seconds for timeouts
			setTimeout(() => resolve(), Math.min(2147483647, Math.max(0, delay)));
		});
	}

	/**
	 * Constant-time string equality. Use for HMAC/signature/secret comparisons
	 * to avoid leaking byte positions through timing.
	 */
	public static safeStringEquals(a: unknown, b: unknown): boolean {
		if (typeof a !== "string" || typeof b !== "string") return false;
		const aBuf = Buffer.from(a);
		const bBuf = Buffer.from(b);
		if (aBuf.length !== bBuf.length) return false;
		return crypto.timingSafeEqual(aBuf, bBuf);
	}

	/**
	 * Derives a purpose-bound secret from `csrf_key` so that the same root
	 * secret can safely back several unrelated uses (CSRF tokens, PayPal
	 * invoice JWTs, the admin reload key, etc.) without compromise of one
	 * exposing the others. HMAC keys can't be inverted to recover the root.
	 */
	public static derivedSecret(purpose: string): string {
		return crypto
			.createHmac("sha256", Config.credentials.csrf_key)
			.update("twitchat:" + purpose)
			.digest("hex");
	}

	public static getUUID(): string {
		return crypto.randomUUID();
	}

	/**
	 * Generates an unbiased random code from a 32-char alphabet using
	 * cryptographically strong randomness (callers use this for things
	 * like Discord link codes).
	 */
	public static generateCode(size: number) {
		const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		const bytes = crypto.randomBytes(size);
		let code = "";
		for (let i = 0; i < size; i++) {
			code += characters[bytes[i]! % characters.length];
		}
		return code;
	}

	public static allowedLogCategories = [
		"streamlabs",
		"hypetrain",
		"tiltify",
		"kofi",
		"patreon",
		"random",
		"eventsub",
		"youtube",
	] as const;
	/**
	 * Saves a log
	 * @param logType
	 * @param logData
	 * @returns
	 */
	public static logToFile(
		logType: (typeof this.allowedLogCategories)[number] | "",
		logData: string,
	): boolean {
		if (logType == "" || this.allowedLogCategories.indexOf(logType) == -1) {
			return false;
		}

		const logPath = Config.LOGS_PATH(logType);
		if (!fs.existsSync(logPath)) {
			fs.writeFileSync(logPath, "", "utf-8");
		}

		fs.appendFileSync(
			logPath,
			"\r\n" + JSON.stringify({ date: new Date().toString(), body: logData }),
		);
		return true;
	}

	/**
	 * Encrypts text using AES-256-CBC
	 * @param text Text to encrypt
	 * @returns encrypted text with IV prepended
	 */
	public static encrypt(text: string): string {
		// Convert hex key to Uint8Array
		const keyUint8 = new Uint8Array(Buffer.from(Config.credentials.patreon_cipherKey, "hex"));

		if (keyUint8.length !== 32) {
			throw new Error("Secret key must be 32 bytes");
		}

		// Generate IV and convert to Uint8Array
		const ivUint8 = new Uint8Array(crypto.randomBytes(12));

		const cipher = crypto.createCipheriv("aes-256-gcm", keyUint8, ivUint8);
		const encryptedBuffer = Buffer.concat([
			cipher.update(Buffer.from(text, "utf8")),
			cipher.final(),
		]);

		const authTag = cipher.getAuthTag();

		return (
			Buffer.from(ivUint8).toString("hex") +
			":" +
			encryptedBuffer.toString("hex") +
			":" +
			authTag.toString("hex")
		);
	}

	/**
	 * Decrypts text using AES-256-CBC
	 * @param encryptedText Text to decrypt (with IV prepended)
	 * @returns decrypted text
	 */
	public static decrypt(encryptedText: string): string {
		const keyUint8 = new Uint8Array(Buffer.from(Config.credentials.patreon_cipherKey, "hex"));

		if (keyUint8.length !== 32) {
			throw new Error("Secret key must be 32 bytes");
		}

		const [ivHex, encryptedHex, authTagHex] = encryptedText.split(":");
		const ivUint8 = new Uint8Array(Buffer.from(ivHex!, "hex"));
		const encryptedUint8 = new Uint8Array(Buffer.from(encryptedHex!, "hex"));
		const authTagUint8 = new Uint8Array(Buffer.from(authTagHex!, "hex"));

		const decipher = crypto.createDecipheriv("aes-256-gcm", keyUint8, ivUint8);
		decipher.setAuthTag(Buffer.from(authTagUint8));

		const decryptedBuffer = Buffer.concat([
			decipher.update(Buffer.from(encryptedUint8)),
			decipher.final(),
		]);

		return decryptedBuffer.toString("utf8");
	}

	/**
	 * Sands a dashboard notification
	 * @param title
	 * @param message
	 * @param action
	 */
	public static sendDashboardNotification(
		title: string,
		message: string,
		action?: { text: string; url: string },
		status: "error" | "neutral" | "success" = "neutral",
	): void {
		if (!Config.credentials.dashboard_url || !Config.credentials.dashboard_token) return;

		void fetch(Config.credentials.dashboard_url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": Config.credentials.dashboard_token,
			},
			body: JSON.stringify({
				title,
				source: "Twitchat",
				description: message,
				status,
				buttonText: action?.text,
				buttonUrl: action?.url,
			}),
		});
	}

	/**
	 * Verify given twitch extension token is valid
	 * @param token
	 * @returns
	 */
	public static verifyTwitchExtensionJWT(token: string): TwitchJWTPayload {
		const secret = Buffer.from(Config.credentials.twitchExtension_client_secret, "base64");
		try {
			const payload = jwt.verify(token, secret, {
				algorithms: ["HS256"],
			}) as TwitchJWTPayload;

			return payload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new Error("JWT token has expired");
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new Error("Invalid JWT token");
			}
			throw error;
		}
	}

	/**
	 * Use in place of fs.promises.readFile as it's much more efficient.
	 * fs.promises.readFile is very slow
	 * @see https://stackoverflow.com/questions/63971379/why-is-fs-readfilesync-faster-than-await-fspromises-readfile
	 * @param path
	 * @param encoding
	 * @returns
	 */
	public static readFileAsync(
		path: string,
		encoding:
			| {
					encoding?: BufferEncoding;
					flag?: string;
					signal?: AbortSignal;
			  }
			| BufferEncoding,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			fs.readFile(path, encoding, (err, data) => {
				if (err) {
					reject(err);
				} else if (typeof data === "string") {
					resolve(data);
				} else {
					reject(new Error("Data is not a string"));
				}
			});
		});
	}

	/**
	 * Write a file atomically: write a temp file then rename it over the target.
	 * A crash mid-write, or a reader loading the file at the same time, can
	 * then never see half written JSON.
	 * @param path
	 * @param content
	 */
	public static async writeFileAtomic(path: string, content: string): Promise<void> {
		const tmp = path + "." + process.pid + "-" + crypto.randomBytes(4).toString("hex") + ".tmp";
		try {
			await fs.promises.writeFile(tmp, content, "utf-8");
			// Workkaround issue where windows refuses to rename.
			// try 5 times just in case then give up and just write in place
			for (let attempt = 0; ; attempt++) {
				try {
					await fs.promises.rename(tmp, path);
					return;
				} catch (error) {
					const code = (error as NodeJS.ErrnoException).code;
					if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") throw error;
					if (attempt >= 5) {
						Logger.warn(
							`[FS] Atomic rename kept failing for ${path}, writing in place`,
						);
						await fs.promises.writeFile(path, content, "utf-8");
						return;
					}
					await Utils.promisedTimeout(20 * (attempt + 1));
				}
			}
		} finally {
			await fs.promises.rm(tmp, { force: true }).catch(() => {});
		}
	}

	/**
	 * Same as "Promise.all(items.map(task))" but with a bounded number of
	 * tasks running at the same time.
	 * Use it whenever the size of the list depends on user data (viewer count,
	 * file count, ...) to avoid opening thousands of concurrent file handles
	 * or HTTP requests.
	 * @param items
	 * @param limit max number of concurrent tasks
	 * @param task
	 * @returns results in the same order as "items"
	 */
	public static async mapLimit<T, R>(
		items: readonly T[],
		limit: number,
		task: (item: T, index: number) => Promise<R>,
	): Promise<R[]> {
		const results = new Array<R>(items.length);
		let cursor = 0;
		const workerCount = Math.min(Math.max(1, limit), items.length);
		const workers: Promise<void>[] = [];
		for (let i = 0; i < workerCount; i++) {
			workers.push(
				(async () => {
					while (true) {
						const index = cursor++;
						if (index >= items.length) return;
						results[index] = await task(items[index]!, index);
					}
				})(),
			);
		}
		await Promise.all(workers);
		return results;
	}

	/**
	 * Gets enabled feature flags for given user
	 * @param uid
	 * @param flagsMap
	 * @returns
	 */
	public static async getUserFeatureFlags(
		uid: string,
		flagsMap?: { [key in Flag]?: string[] },
	): Promise<Flag[]> {
		// Get user's feature flags. An empty (or missing) list means the flag is
		// open to everyone; once any UID is listed, access is restricted to that list.
		const forcedClosedFF: Flag[] = ["groq", "export_configs", "join_leave_triggers"];
		if (!flagsMap) {
			const content = await Utils.readFileAsync(Config.FEATURE_FLAGS_PATH, "utf-8");
			flagsMap = JSON.parse(content) as { [key in Flag]?: string[] };
		}
		return Config.FEATURE_FLAGS.filter((flag) => {
			const list = flagsMap[flag] ?? [];
			return (list.length === 0 && !forcedClosedFF.includes(flag)) || list.includes(uid);
		});
	}

	/**
	 * Returns a seeded random generator.
	 * Just call the given function to get a new pseudo random number
	 * @param seed
	 * @returns
	 */
	public static seededRandom(seed: number | string): () => number {
		let s = typeof seed == "string" ? this.hashCode(seed) : seed;
		return () => {
			s |= 0;
			s = (s + 0x9e3779b9) | 0;
			let t = s ^ (s >>> 16);
			t = Math.imul(t, 0x21f0aaad);
			t = t ^ (t >>> 15);
			t = Math.imul(t, 0x735a2d97);
			return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Hashes given string to number
	 * @param str
	 * @returns
	 */
	public static hashCode(str: string): number {
		let h = 0x811c9dc5;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}

	/**
	 * Detects an image type from its magic bytes on given buffer.
	 */
	public static getImageMimeType(buffer: Buffer): string | null {
		if (buffer.length < 12) return null;

		if (
			buffer[0] === 0x89 &&
			buffer.subarray(1, 4).toString("ascii") === "PNG" &&
			buffer[4] === 0x0d &&
			buffer[5] === 0x0a &&
			buffer[6] === 0x1a &&
			buffer[7] === 0x0a
		) {
			return "image/png";
		}
		if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";

		const head6 = buffer.subarray(0, 6).toString("ascii");
		if (head6 === "GIF87a" || head6 === "GIF89a") return "image/gif";

		if (
			buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
			buffer.subarray(8, 12).toString("ascii") === "WEBP"
		) {
			return "image/webp";
		}
		if (buffer.subarray(4, 12).toString("ascii") === "ftypavif") return "image/avif";

		return null;
	}
}

type Flag = (typeof Config.FEATURE_FLAGS)[number];
export interface TwitchJWTPayload {
	exp: number;
	opaque_user_id: string;
	user_id?: string;
	channel_id: string;
	role: "broadcaster" | "moderator" | "viewer" | "external";
	is_unlinked?: boolean;
	pubsub_perms?: {
		listen?: string[];
		send?: string[];
	};
}
