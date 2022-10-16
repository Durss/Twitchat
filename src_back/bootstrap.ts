import Fastify, { FastifyInstance } from 'fastify';
import Config from "./utils/Config";
import Logger from './utils/Logger';
import * as path from "path";
import * as fs from "fs";
import AuthController from './controllers/AuthController';
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

// Declare a route
server.get('/api', async (request, reply) => {
	return { success: true };
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

	//Create controllers
	await new AuthController(server);

	Logger.success("===========================");
	Logger.success("Server ready on port "+Config.SERVER_PORT);
	Logger.success("===========================");
}
start();