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
fs.mkdirSync(Config.BETA_DATA_FOLDER, { recursive: true });
fs.mkdirSync(Config.DONORS_DATA_FOLDER, { recursive: true });

const server:FastifyInstance = Fastify({logger: false});
server.register(import('fastify-raw-body'), {
  runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
}).then(()=> {
	//Create controllers
	new MiddlewareController(server).initialize();
	new FileServeController(server).initialize();
	new AuthController(server).initialize();
	new DonorController(server).initialize();
	new UserController(server).initialize();
	new SpotifyController(server).initialize();
	new BetaController(server).initialize();
	new UluleController(server).initialize();
	new PatreonController(server).initialize();
	new TenorController(server).initialize();
	new PaypalController(server).initialize();
	new GoogleController(server).initialize();
	
	//Start server
	start();
})