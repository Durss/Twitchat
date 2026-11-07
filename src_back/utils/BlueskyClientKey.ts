import * as crypto from "crypto";
import * as fs from "fs";
import jwt from "jsonwebtoken";
import Config from "./Config.js";
import Logger from "./Logger.js";

/**
 * Holds the key pair that makes Twitchat a "confidential" AT Protocol OAuth
 * client.
 *
 * The AT Protocol spec caps sessions of "public" clients (no client
 * authentication) at 2 weeks. A client that can prove its identity by signing a
 * JWT ("client assertion") with a private key gets 2 years instead, with
 * refresh tokens valid 3 months, and may attempt silent sign-in.
 *
 * That private key can obviously not live in the browser, so the frontend asks
 * this backend for a short lived assertion right before each call to an
 * authorization server's token/PAR/revocation endpoint. The key never leaves
 * this process, and an assertion alone is useless: it only authenticates
 * Twitchat as an app, the user's tokens stay in their browser.
 *
 * IMPORTANT: the key file must be part of the regular backups. Losing it (or
 * rotating it) invalidates every Bluesky session of every user at once, as the
 * authorization servers verify assertions against the public key published on
 * `/oauth/jwks.json`.
 *
 * Created : 17/08/2026
 */
export default class BlueskyClientKey {
	private static _kid: string = "";
	private static _privateKey: crypto.KeyObject | null = null;
	private static _publicJwk: ClientJwk | null = null;

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/**
	 * Public key set to publish at the "jwks_uri" declared on the client
	 * metadata document. Authorization servers download it to verify our
	 * assertions.
	 */
	public static get jwks(): { keys: ClientJwk[] } {
		this.load();
		return { keys: this._publicJwk ? [this._publicJwk] : [] };
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/

	/**
	 * Builds a client assertion authenticating Twitchat to the given
	 * authorization server.
	 *
	 * @param clientId	our client metadata document URL, which acts as the
	 * 					client identifier
	 * @param audience	the authorization server's issuer
	 * @see https://www.rfc-editor.org/rfc/rfc7523.html#section-3
	 */
	public static createAssertion(clientId: string, audience: string): string {
		this.load();
		if (!this._privateKey) throw new Error("Bluesky client key unavailable");

		return jwt.sign(
			{
				//The entity that issued the JWT and, for client authentication,
				//the client it authenticates: both are our client_id
				iss: clientId,
				sub: clientId,
				aud: audience,
				//Lets the authorization server reject replays
				jti: crypto.randomUUID(),
			},
			this._privateKey,
			{
				algorithm: "ES256",
				keyid: this._kid,
				//Only has to survive the round trip to the browser and the
				//request it gets attached to
				expiresIn: 60,
			},
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Loads the key pair from disk, generating it on first run.
	 */
	private static load(): void {
		if (this._privateKey) return;

		const path = Config.BLUESKY_CLIENT_KEY_PATH;
		let jwk: ClientJwk;
		if (fs.existsSync(path)) {
			try {
				jwk = JSON.parse(fs.readFileSync(path, "utf8"));
				//Update older file permissions
				try {
					fs.chmodSync(path, 0o600);
				} catch (_error) {
					//Not supported on this platform, nothing to do
				}
			} catch (error) {
				//Refuse to silently generate a new key over a corrupted one: that
				//would disconnect every user instead of failing loudly here
				Logger.error("Bluesky client key is unreadable => " + path);
				console.log(error);
				throw new Error("Bluesky client key is corrupted");
			}
		} else {
			const { privateKey } = crypto.generateKeyPairSync("ec", {
				namedCurve: "P-256",
			});
			const generated = privateKey.export({ format: "jwk" });
			jwk = {
				kty: generated["kty"] as string,
				crv: generated["crv"] as string,
				x: generated["x"] as string,
				y: generated["y"] as string,
				d: generated["d"] as string,
				kid: crypto.randomBytes(8).toString("hex"),
				alg: "ES256",
				use: "sig",
			};
			//Private signing key: owner read/write only, never world readable
			fs.writeFileSync(path, JSON.stringify(jwk), { encoding: "utf8", mode: 0o600 });
			Logger.info("Generated a new Bluesky OAuth client key => " + path);
		}

		if (!jwk?.kid || !jwk.d) throw new Error("Bluesky client key is incomplete");

		this._kid = jwk.kid;
		this._privateKey = crypto.createPrivateKey({
			key: { ...jwk },
			format: "jwk",
		});
		//Same key without its private part ("d")
		this._publicJwk = {
			kty: jwk.kty,
			crv: jwk.crv,
			x: jwk.x,
			y: jwk.y,
			kid: jwk.kid,
			alg: "ES256",
			use: "sig",
		};
	}
}

/**
 * The client key, in the JWK form it's stored and published as.
 */
interface ClientJwk {
	kty: string;
	crv: string;
	x: string;
	y: string;
	/**
	 * Private part. Only ever set on the stored key, never on the published one.
	 */
	d?: string;
	kid: string;
	alg: string;
	use: string;
}
