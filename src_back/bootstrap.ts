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
fs.mkdirSync(Config.betaDataFolder, { recursive: true });
fs.mkdirSync(Config.donorsDataFolder, { recursive: true });

const server:FastifyInstance = Fastify({logger: false});

//Create controllers
new MiddlewareController(server).initialize();
new FileServeController(server).initialize();
new AuthController(server).initialize();
new DonorController(server).initialize();
new UserController(server).initialize();
new SpotifyController(server).initialize();
new BetaController(server).initialize();

//Start server
start();