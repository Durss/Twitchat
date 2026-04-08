import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";

/**
 * Created : 25/02/2024
 */
export default class ApiController extends AbstractController {
	/**
	 * PKCS8 ASN.1 prefix for Ed25519 private keys (16 bytes).
	 * The full DER is this prefix followed by the 32-byte seed.
	 */
	private static readonly ED25519_PKCS8_PREFIX = Buffer.from(
		"302e020100300506032b657004220420",
		"hex",
	);
	private static readonly MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(): void {
		this.server.post(
			"/api/remote/action",
			async (request, response) => await this.postRemoteAction(request, response),
		);
		this.server.post(
			"/api/remote/key",
			async (request, response) => await this.postGenerateKey(request, response),
		);
		this.server.delete(
			"/api/remote/key",
			async (request, response) => await this.deleteKey(request, response),
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Returns the file path storing the public key for the given user ID.
	 * Validates that the uid contains only digits to prevent path traversal.
	 */
	private getPublicKeyPath(uid: string): string | null {
		if (!/^[0-9]+$/.test(uid)) return null;
		return path.join(Config.API_KEYS_PATH, uid + ".pem");
	}

	/**
	 * Generates an Ed25519 keypair.
	 * The public key is stored on disk; the private key is returned to the
	 * user exactly once and never persisted.
	 *
	 * Requires Twitch authentication (the user must be logged in).
	 */
	private async postGenerateKey(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const userInfo = await this.twitchUserGuard(request, response);
		if (userInfo === false) return;

		const uid = userInfo.user_id;
		const keyPath = this.getPublicKeyPath(uid);
		if (!keyPath) {
			response
				.header("Content-Type", "application/json")
				.status(400)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "INVALID_UID",
						error: "Invalid user ID",
					}),
				);
			return;
		}

		const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
			publicKeyEncoding: { type: "spki", format: "pem" },
			privateKeyEncoding: { type: "pkcs8", format: "der" },
		});

		// Extract the raw 32-byte seed from the 48-byte PKCS8 DER
		const seed = (privateKey as Buffer).subarray(ApiController.ED25519_PKCS8_PREFIX.length);
		const compactKey = "twitchat_" + seed.toString("base64url");

		// Persist only the public key
		fs.writeFileSync(keyPath, publicKey as string, "utf-8");

		Logger.info("API", "Generated remote API key for user " + uid);

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(
				JSON.stringify({
					success: true,
					data: {
						privateKey: compactKey,
					},
				}),
			);
	}

	/**
	 * Deletes the stored public key, effectively revoking the API key.
	 * Requires Twitch authentication.
	 */
	private async deleteKey(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const userInfo = await this.twitchUserGuard(request, response);
		if (userInfo === false) return;

		const uid = userInfo.user_id;
		const keyPath = this.getPublicKeyPath(uid);
		if (!keyPath) {
			response
				.header("Content-Type", "application/json")
				.status(400)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "INVALID_UID",
						error: "Invalid user ID",
					}),
				);
			return;
		}

		if (fs.existsSync(keyPath)) {
			fs.unlinkSync(keyPath);
			Logger.info("API", "Deleted remote API key for user " + uid);
		}

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true }));
	}

	/**
	 * Executes a Twitchat action remotely.
	 *
	 * Authentication is done via Ed25519 signature verification:
	 * - X-Twitchat-UserId: Twitch user ID
	 * - X-Twitchat-Timestamp: unix ms when the request was signed
	 * - X-Twitchat-Signature: base64-encoded Ed25519 signature of
	 *     `${timestamp}\nPOST\n/api/remote/action\n${body}`
	 */
	private async postRemoteAction(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const uid = request.headers["x-twitchat-userid"] as string | undefined;
		const timestamp = request.headers["x-twitchat-timestamp"] as string | undefined;
		const signature = request.headers["x-twitchat-signature"] as string | undefined;

		if (!uid || !timestamp || !signature) {
			response
				.header("Content-Type", "application/json")
				.status(400)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "MISSING_HEADERS",
						error: "Missing required X-Twitchat-UserId, X-Twitchat-Timestamp, or X-Twitchat-Signature headers",
					}),
				);
			return;
		}

		// Validate timestamp to prevent replay attacks
		const ts = parseInt(timestamp, 10);
		if (isNaN(ts) || Math.abs(Date.now() - ts) > ApiController.MAX_TIMESTAMP_DRIFT_MS) {
			response
				.header("Content-Type", "application/json")
				.status(401)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "INVALID_TIMESTAMP",
						error: "Timestamp is missing or too far from server time (max 5 minutes)",
					}),
				);
			return;
		}

		// Load the user's public key
		const keyPath = this.getPublicKeyPath(uid);
		if (!keyPath || !fs.existsSync(keyPath)) {
			response
				.header("Content-Type", "application/json")
				.status(401)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "NO_API_KEY",
						error: "No API key found for this user. Generate one first.",
					}),
				);
			return;
		}

		const publicKeyPem = fs.readFileSync(keyPath, "utf-8");

		// Reconstruct the signed payload
		const bodyStr =
			typeof request.body === "string" ? request.body : JSON.stringify(request.body);
		const payload = `${timestamp}\nPOST\n/api/remote/action\n${bodyStr}`;

		// Verify the signature
		let valid = false;
		try {
			valid = crypto.verify(
				null,
				Buffer.from(payload),
				publicKeyPem,
				Buffer.from(signature, "base64"),
			);
		} catch {
			valid = false;
		}

		if (!valid) {
			response
				.header("Content-Type", "application/json")
				.status(401)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "INVALID_SIGNATURE",
						error: "Signature verification failed",
					}),
				);
			return;
		}

		// Signature is valid — forward the action to the connected frontend
		const sent = SSEController.sendToUser(uid, "REMOTE_ACTION", request.body);
		if (!sent) {
			response
				.header("Content-Type", "application/json")
				.status(422)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "USER_NOT_CONNECTED",
						error: "No active Twitchat session found for this user",
					}),
				);
			return;
		}

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true }));
	}
}
