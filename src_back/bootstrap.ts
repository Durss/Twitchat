import Fastify, { FastifyInstance } from 'fastify';
import Config from "./utils/Config";
import Logger from './utils/Logger';
import * as path from "path";
import * as fs from "fs";
import AuthController from './controllers/AuthController';
import DonorController from './controllers/DonorController';
import UserController from './controllers/UserController';
import SpotifyController from './controllers/SpotifyController';
const mime = require('mime-types');

const server: FastifyInstance = Fastify({logger: false});

server.register(require('@fastify/rate-limit'), {
	max: 10,
	ban: 2,
	addHeaders:{
		'x-ratelimit-limit': false,
		'x-ratelimit-remaining': false,
		'x-ratelimit-reset': true,
		'retry-after': false
	},
	timeWindow: '30000',
	allowList: (request, key) => {
		if(!/\/api\//.test(request.url)){
			return true;
		}
		return false;
	}
});

server.register(require('@fastify/cors'), { 
	origin:[/localhost/i, /twitchat\.fr/i],
	methods:['GET', 'PUT', 'POST'],
	decorateReply: true,
	exposedHeaders:["x-ratelimit-reset"]
})

server.register(require('@fastify/static'), {
	root: path.join(__dirname, Config.PUBLIC_ROOT),
	prefix: '/',
	// setHeaders:(res, path)=>{
	// 	console.log("SET HEADER:", path);
	// 	res.setHeader("Set-Cookie", "cross-site-cookie=*; SameSite=None; Secure");
	// }
})

//Defautl API route
server.get('/api', async (request, response) => {
	return { success: true };
});

//Get latest script.js file for cache bypass
server.get('/api/script', async (request, response) => {
	Logger.info("Serving script for cache bypass")
	const file = fs.readdirSync(Config.PUBLIC_ROOT).find(v => /index\..*\.js/gi.test(v));
	const txt = fs.readFileSync(Config.PUBLIC_ROOT+"/"+file, {encoding:"utf8"});
	console.log(txt);
	response.header('Content-Type', 'application/javascript');
	response.status(200);
	response.send(txt);
});

//Get latest script.js file for cache bypass
server.get('/api/configs', async (request, response) => {
	response.header('Content-Type', 'application/javascript');
	response.status(200);
	response.send(JSON.stringify({
		client_id:Config.credentials.client_id,
		scopes:Config.credentials.scopes,
		spotify_scopes:Config.credentials.spotify_scopes,
		spotify_client_id:Config.credentials.spotify_client_id,
		deezer_scopes:Config.credentials.deezer_scopes,
		deezer_client_id:Config.credentials.deezer_client_id,
		deezer_dev_client_id:Config.credentials.deezer_dev_client_id,
	}));
});


server.setNotFoundHandler({
	preValidation: (request, reply, done) => {
		done();
	},
	preHandler: (req, reply, done) => {
		done()
	}
	
}, (request, reply) => {
	if(/^\/api/gi.test(request.url)) {
		console.log("404 !", request.url);
		reply.code(404).send({success:false, error:"Not found"});
	}

	let file = path.join(__dirname, Config.PUBLIC_ROOT, request.url);
	//No file exists at specified path, send index file
	if(!fs.existsSync(file)) {
		file = path.join(__dirname, Config.PUBLIC_ROOT, "index.html");
	}
	const stream = fs.createReadStream(file, 'utf8' );

	const mimetype = mime.lookup(file);
	if(mimetype == "text/html") {
		reply.header('Content-Type', mimetype+"; charset=utf-8");
	}else{
		reply.header('Content-Type', mimetype);
	}

	reply.send(stream);
});

// Run the server!
const start = async () => {
	try {
		await server.listen({port:Config.SERVER_PORT, host:'0.0.0.0'});
	} catch (err) {
		server.log.error(err)
		process.exit(1)
	}
	

	Logger.success("=========================");
	Logger.success("Server ready on port "+Config.SERVER_PORT);
	Logger.success("=========================");
}

//Create controllers
new AuthController(server).initialize();
new DonorController(server).initialize();
new UserController(server).initialize();
new SpotifyController(server).initialize();

//Start server
start();