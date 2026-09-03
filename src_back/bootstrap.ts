import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import Fastify, { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { FastifySSEPlugin } from "fastify-sse-v2";
import * as fs from "fs";
import AdminController from "./controllers/AdminController.js";
import ApiController from "./controllers/ApiController.js";
import AuthController from "./controllers/AuthController.js";
import BingoGridController from "./controllers/BingoGridController.js";
import BlueskyController from "./controllers/BlueskyController.js";
import DiscordController from "./controllers/DiscordController.js";
import DonorController from "./controllers/DonorController.js";
import FileServeController from "./controllers/FileServeController.js";
import GoogleController from "./controllers/GoogleController.js";
import KofiController from "./controllers/KofiController.js";
import MiddlewareController from "./controllers/MiddlewareController.js";
import PatreonController from "./controllers/PatreonController.js";
import PaypalController from "./controllers/PaypalController.js";
import QuizController from "./controllers/QuizController.js";
import RemoteModController from "./controllers/RemoteModController.js";
import SSEController from "./controllers/SSEController.js";
import SpotifyController from "./controllers/SpotifyController.js";
import StreamelementsController from "./controllers/StreamelementsController.js";
import StreamlabsController from "./controllers/StreamlabsController.js";
import TiltifyController from "./controllers/TiltifyController.js";
import TipeeeController from "./controllers/TipeeeController.js";
import TwitchExtensionController from "./controllers/TwitchExtensionController.js";
import UluleController from "./controllers/UluleController.js";
import UserController from "./controllers/UserController.js";
import Config from "./utils/Config.js";
import I18n from "./utils/I18n.js";
import Logger from "./utils/Logger.js";

//Global safety net. Node exits the process on the first unhandled rejection, which
//drops every SSE connection and every in-flight request. A third party going down
//must never be able to take the server with it, so log and keep serving.
process.on("unhandledRejection", (reason) => {
	Logger.error("Unhandled promise rejection");
	console.log(reason);
});

/**
 * Logs a controller that failed to initialize without aborting the boot.
 * The related feature is degraded, everything else keeps working.
 */
const bootError =
	(name: string) =>
	(error: unknown): void => {
		Logger.error("Failed initializing " + name);
		console.log(error);
	};

fs.mkdirSync(Config.USER_DATA_PATH, { recursive: true });
fs.mkdirSync(Config.USER_DATA_BACKUP_PATH, { recursive: true });
fs.mkdirSync(Config.BETA_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DONORS_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.KO_FI_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.TILTIFY_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.API_KEYS_PATH, { recursive: true });
fs.mkdirSync(Config.LOGS_FOLDER, { recursive: true });
fs.mkdirSync(Config.BINGO_ROOT, { recursive: true });

I18n.instance.initialize();

// Trusted proxies for resolving the real client IP from X-Forwarded-For.
// Dynamically loading Cloudflare IPs
const loadCloudflareIps = async (url: string): Promise<string> => {
	const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
	if (!res.ok) throw new Error(url + " returned status " + res.status);
	return await res.text();
};

let cloudflareIpList: string[] = [];
try {
	const [ipv4, ipv6] = await Promise.all([
		loadCloudflareIps("https://www.cloudflare.com/ips-v4/"),
		loadCloudflareIps("https://www.cloudflare.com/ips-v6/"),
	]);
	cloudflareIpList = [...ipv4.split("\n"), ...ipv6.split("\n")]
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
} catch (error) {
	Logger.error(
		"Failed loading Cloudflare IP ranges. Requests coming through Cloudflare will share a single rate limit bucket and ban decisions will hit whole edges.",
	);
	console.log(error);
}
if (cloudflareIpList.length > 0) {
	Logger.info("Loaded " + cloudflareIpList.length + " Cloudflare IP ranges");
}
const TRUSTED_PROXIES: string[] = [
	"127.0.0.1",
	"::1",
	// Private ranges (in-cluster proxies, internal load balancers)
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	// Cloudflare IPs
	...cloudflareIpList,
];

const server: FastifyInstance = Fastify({
	logger: false,
	bodyLimit: 20 * 1024 * 1024,
	keepAliveTimeout: 300000,
	trustProxy: TRUSTED_PROXIES,
});

await server.register(fastifyFormbody);
await server.register(FastifySSEPlugin);

// Don't remove that plugin, it's used for Discord image upload!
await server.register(fastifyMultipart, {
	attachFieldsToBody: "keyValues",
	limits: {
		fileSize: 2000000, // For multipart forms, the max file size in bytes
		files: 2, // Max number of file fields
		parts: 10, // For multipart forms, the max number of parts (fields + files)
	},
});

await server.register(fastifyRawBody, {
	runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
});

//Create controllers
const discord = new DiscordController(server).initialize();
await new MiddlewareController(server).initialize();
const userController = new UserController(server, discord);
userController
	.initialize()
	.then(() => {
		userController.setTwitchExtensionController(extensionController);
	})
	.catch(bootError("UserController"));
new FileServeController(server).initialize().catch(bootError("FileServeController"));
new BlueskyController(server).initialize().catch(bootError("BlueskyController"));
new AuthController(server).initialize().catch(bootError("AuthController"));
new DonorController(server).initialize().catch(bootError("DonorController"));
new SpotifyController(server).initialize().catch(bootError("SpotifyController"));
new AdminController(server).initialize().catch(bootError("AdminController"));
new UluleController(server).initialize().catch(bootError("UluleController"));
new PatreonController(server).initialize().catch(bootError("PatreonController"));
new PaypalController(server).initialize().catch(bootError("PaypalController"));
new GoogleController(server).initialize().catch(bootError("GoogleController"));
new SSEController(server).initialize();
new ApiController(server).initialize();
new StreamlabsController(server).initialize().catch(bootError("StreamlabsController"));
new StreamelementsController(server).initialize().catch(bootError("StreamelementsController"));
new KofiController(server).initialize();
new TipeeeController(server).initialize().catch(bootError("TipeeeController"));
new RemoteModController(server).initialize();
new TiltifyController(server).initialize().catch(bootError("TiltifyController"));
const bingoController = new BingoGridController(server).initialize();
const quizController = new QuizController(server).initialize();
const extensionController = new TwitchExtensionController(server).initialize(
	bingoController,
	quizController,
	userController,
);

bingoController.setTwitchExtensionController(extensionController);
quizController.setTwitchExtensionController(extensionController);

// In Docker the bind port is fixed via the PORT env (set in the Dockerfile), so every
// container listens on the same internal port and only the published host port varies
// per environment (see docker-compose.yml). Outside Docker it falls back to credentials.json.
const port = Number(process.env["PORT"]) || Config.credentials.server_port;

try {
	await server.listen({ port, host: "0.0.0.0" });
} catch (err) {
	Logger.error("Server init error");
	console.log(err);
	process.exit(1);
}

Logger.success("=========================");
Logger.success("Server ready on port " + port);
Logger.success("=========================");
