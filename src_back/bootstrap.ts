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

fs.mkdirSync(Config.USER_DATA_PATH, { recursive: true });
fs.mkdirSync(Config.USER_DATA_BACKUP_PATH, { recursive: true });
fs.mkdirSync(Config.BETA_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DONORS_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.KO_FI_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.TILTIFY_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.LOGS_FOLDER, { recursive: true });
fs.mkdirSync(Config.BINGO_ROOT, { recursive: true });

I18n.instance.initialize();

const server: FastifyInstance = Fastify({
	logger: false,
	bodyLimit: 20 * 1024 * 1024,
	keepAliveTimeout: 300000,
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
void new UserController(server, discord).initialize();
void new FileServeController(server).initialize();
void new AuthController(server).initialize();
void new DonorController(server).initialize();
void new SpotifyController(server).initialize();
void new AdminController(server).initialize();
void new UluleController(server).initialize();
void new PatreonController(server).initialize();
void new PaypalController(server).initialize();
void new GoogleController(server).initialize();
new SSEController(server).initialize();
new ApiController(server).initialize();
void new StreamlabsController(server).initialize();
void new StreamelementsController(server).initialize();
new KofiController(server).initialize();
void new TipeeeController(server).initialize();
new RemoteModController(server).initialize();
void new TiltifyController(server).initialize();
const bingoController = new BingoGridController(server).initialize();
const quizController = new QuizController(server).initialize();
const extensionController = new TwitchExtensionController(server).initialize(
	bingoController,
	quizController,
);

bingoController.setTwitchExtensionController(extensionController);
quizController.setTwitchExtensionController(extensionController);

try {
	await server.listen({ port: Config.credentials.server_port, host: "0.0.0.0" });
} catch (err) {
	Logger.error("Server init error");
	console.log(err);
	process.exit(1);
}

Logger.success("=========================");
Logger.success("Server ready on port " + Config.credentials.server_port);
Logger.success("=========================");
