import Fastify, { FastifyInstance } from 'fastify';
import Config from "./utils/Config";
import Logger from './utils/Logger';
import * as fs from "fs";
import AuthController from './controllers/AuthController';
import DonorController from './controllers/DonorController';
import UserController from './controllers/UserController';
import SpotifyController from './controllers/SpotifyController';
import BetaController from './controllers/BetaController';
import FileServeController from './controllers/FileServeController';
import MiddlewareController from './controllers/MiddlewareController';
import UluleController from './controllers/UluleController';
import PatreonController from './controllers/PatreonController';
import TenorController from './controllers/TenorController';
import PaypalController from './controllers/PaypalController';
import GoogleController from './controllers/GoogleController';
import SSEController from './controllers/SSEController';
import DiscordController from './controllers/DiscordController';
import I18n from './utils/I18n';
import ApiController from './controllers/ApiController';
import StreamlabsController from './controllers/StreamlabsController';
import KofiController from './controllers/KofiController';
import StreamelementsController from './controllers/StreamelementsController';
import TipeeeController from './controllers/TipeeeController';
import BingoGridController from './controllers/BingoGridController';

// Run the server!
async function start():Promise<void> {
	try {
		await server.listen({port:Config.credentials.server_port, host:'0.0.0.0'});
	} catch (err) {
		Logger.error("Server init error");
		console.log(err);
		process.exit(1)
	}

	Logger.success("=========================");
	Logger.success("Server ready on port "+Config.credentials.server_port);
	Logger.success("=========================");
}

fs.mkdirSync(Config.USER_DATA_PATH, { recursive: true });
fs.mkdirSync(Config.USER_DATA_BACKUP_PATH, { recursive: true });
fs.mkdirSync(Config.BETA_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DONORS_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DISCORD_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.KO_FI_DATA_FOLDER, { recursive: true });

I18n.instance.initialize();

const server:FastifyInstance = Fastify({logger: false});
server.register(import("@fastify/formbody"))
server.register(import("fastify-sse-v2"))
.register(import("@fastify/multipart"),{
	attachFieldsToBody: 'keyValues',
	limits: {
		fileSize: 2000000,  // For multipart forms, the max file size in bytes
		files: 2,           // Max number of file fields
		parts: 100         // For multipart forms, the max number of parts (fields + files)
	}
})
.register(import("fastify-raw-body"), {
  runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
}).then(async ()=> {
	//Create controllers
	const discord = new DiscordController(server).initialize();
	await new MiddlewareController(server).initialize();
	new UserController(server,discord).initialize();
	new FileServeController(server).initialize();
	new AuthController(server).initialize();
	new DonorController(server).initialize();
	new SpotifyController(server).initialize();
	new BetaController(server).initialize();
	new UluleController(server).initialize();
	new PatreonController(server).initialize();
	new TenorController(server).initialize();
	new PaypalController(server).initialize();
	new GoogleController(server).initialize();
	new SSEController(server).initialize();
	new ApiController(server).initialize();
	new StreamlabsController(server).initialize();
	new StreamelementsController(server).initialize();
	new KofiController(server).initialize();
	new TipeeeController(server).initialize();
	new BingoGridController(server).initialize();
	
	//Start server
	start();
});