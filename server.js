//DIRTY ASS LAZY SERVER !
//Will do that properly someday :3
const fs = require('fs');
const statik = require('node-static');
const fileServer = new statik.Server('./dist');
const http = require('http');
const UrlParser = require('url');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const Ajv = require("ajv")
const JsonPatch = require('fast-json-patch');
const Logger = require('./Logger.js').default;

const port = 3018;
const userDataFolder = "./userData/";
const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));

Logger.success("==============");
Logger.success("Server started");
Logger.success("==============");


if(!fs.existsSync(userDataFolder)) {
	fs.mkdirSync(userDataFolder);
}

http.createServer((request, response) => {
    let body = "";
    request.on('readable', (r) =>{
        const data = request.read();
		if(data) body += data;
    });

	request.addListener('end', async () => {
		// Logger.log("CALL", request.method, request.url);
		if(request.method == "HEAD") {
			response.end();
			return;
		}
		
		if(request.method == "OPTIONS") {
			setHeaders(request, response);
			response.end("OK");
			return;
		}
		
		if(request.url.indexOf("/api") == 0) {
			setHeaders(request, response);
			const endpoint = request.url.replace(/\?.*/gi, "");
			
			//Get client ID
			if(endpoint == "/api/configs") {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({
					client_id:credentials.client_id,
					scopes:credentials.scopes,
					spotify_scopes:credentials.spotify_scopes,
					spotify_client_id:credentials.spotify_client_id,
					deezer_scopes:credentials.deezer_scopes,
					deezer_client_id:credentials.deezer_client_id,
					deezer_dev_client_id:credentials.deezer_dev_client_id,
				}));
				return;

			//Get latest script
			}else if(endpoint == "/api/script") {
				const file = fs.readdirSync("./dist/assets").find(v => /index\..*\.js/gi.test(v));
				const txt = fs.readFileSync("./dist/assets/"+file, {encoding:"utf8"});
				response.writeHead(200, {'Content-Type': 'application/javascript'});
				response.end(txt);
				return;

				return;
		
			//Get/Set user data
			}else if(endpoint == "/api/user") {
				userData(request, response, body);
				return;
		
			//Get current chatters
			}else if(endpoint == "/api/chatters") {
				getChatters(request, response, body);
				return;
			
			//Generate token from auth code
			}else if(endpoint == "/api/gettoken") {
				generateToken(request, response);
				return;
			
			//Generate token from auth code
			}else if(endpoint == "/api/CSRFToken") {
				CSRFToken(request, response);
				return;
			
			//Get fake chat events
			}else if(endpoint == "/api/fakeevents") {
				getFakeEvents(request, response);
				return;

			//Refresh access token
			}else if(endpoint == "/api/refreshtoken") {
				refreshToken(request, response);
				return;

			//Get users
			}else if(endpoint == "/api/users") {
				getUsers(request, response);
				return;

			//Get users
			}else if(endpoint == "/api/userdata") {
				getUserData(request, response);
				return;

			//Get spotify token
			}else if(endpoint == "/api/spotify/auth") {
				spotifyAuthenticate(request, response);
				return;

			//Rrefresh spotify access_token
			}else if(endpoint == "/api/spotify/refresh_token") {
				spotifyRefreshToken(request, response);
				return;

			//Get deezer token
			}else if(endpoint == "/api/deezer/auth") {
				deezerAuthenticate(request, response);
				return;

			//Get deezer token
			}else if(endpoint == "/api/clip") {
				twitchClip(request, response);
				return;

			//Rrefresh deezer access_token
			// }else if(endpoint == "/api/deezer/search") {
			// 	const res = await fetch("https://api.deezer.com/search?q=prout", {
			// 		"headers": {
			// 			"accept": "*/*",
			// 		},
			// 		"body": null,
			// 		"method": "GET",
			// 	});
			// 	const json = await res.json();
			// 	Logger.log(json)
			// 	response.writeHead(200, {'Content-Type': 'application/json'});
			// 	response.end(JSON.stringify(json));
			// 	return;
			
			//Endpoint not found
			}else{
				response.writeHead(404, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({error: "This endpoint does not exist"}));
				return;
			}
		}else{
			await fileServer.serve(request, response, async (err, result) => {
				if (err) {
					if(request.url.toLowerCase().indexOf("oauth") == -1
					&& request.url.toLowerCase().indexOf("chat") == -1
					&& request.url.toLowerCase().indexOf("overlay") == -1
					&& request.url.toLowerCase().indexOf("spotify") == -1
					&& request.url.toLowerCase().indexOf("deezer") == -1
					&& request.url.toLowerCase().indexOf("sponsor") == -1
					&& request.url.toLowerCase().indexOf("home") == -1
					&& request.url.toLowerCase().indexOf("voice") == -1
					&& request.url.toLowerCase().indexOf("logout") == -1
					&& request.url.toLowerCase().indexOf("login") == -1) {
						Logger.warn("Error serving " + request.headers.host+request.url + " - " + err.message);
					}

					// let page = request.url;
					// if(fs.existsSync("./dist/"+page)) {
					// 	fileServer.serveFile( page, 200, {}, request, response );
					// 	return;
					// }
					
					// page += ".html";
					// if(fs.existsSync("./dist/"+page)) {
					// 	fileServer.serveFile( page, 200, {}, request, response );
					// 	return;
					// }

					await fileServer.serveFile( '/index.html', 200, {}, request, response );
				}
			});
		}
	}).resume();
}).listen(port);


function setHeaders(request, response) {
	if(request.headers.host
	&& (credentials.redirect_uri.indexOf(request.headers.host.replace(/:[0-9]+/gi, "")) > -1
		|| request.headers.host.indexOf("192.168") > -1)
	) {
		//Set CORS headers if host is found on the redirect URI
		response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
		response.setHeader('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN,Authorization');
		response.setHeader('Access-Control-Allow-Origin', "*");
	}
}

/**
 * Generates an access token from an auth code
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function generateToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
	url += "?client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&code="+params.code;
	url += "&grant_type=authorization_code";
	url += "&redirect_uri="+credentials.redirect_uri;
	
	let json;
	try {
		let res = await fetch(url, {method:"POST"});
		json = await res.json();
	}catch(error) {
		Logger.error("Token generation failed");
		Logger.error(error);
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Generates/verifies a CSRF token to secure twitch authentication
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function CSRFToken(request, response) {
	if(request.method == "GET") {
		//Generate a token
		const token = jwt.sign({date:Date.now()}, credentials.csrf_key);
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({token}));
		return;

	}else if(request.method == "POST") {
		//Verifies a CSRF token
		const params = UrlParser.parse(request.url, true).query;
		const result = jwt.verify(params.token, credentials.csrf_key);
		if(result) {
			//Token valid only for 5 minutes
			if(result.date > Date.now() - 5*60*1000) {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({success:true}));
			}else{
				//Token expired
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({success:false, message:"CSRF token expired, please try again"}));
			}
		}else{
			//Invalid token
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:false, message:"Invalid CSRF token"}));
		}
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({success:false, message:"Unsupported method "+request.method}));
}

/**
 * Frefresh an access token
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function refreshToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
	url += "?client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&refresh_token="+params.token;
	url += "&grant_type=refresh_token";
	
	let json;
	try {
		let res = await fetch(url, {method:"POST"});
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Get/set a user's data
 */
async function userData(request, response, body) {
	let userInfo = await getUserFromToken(request.headers.authorization);
	if(!userInfo) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"Invalid access token", success:false}));
		return;
	}

	//Get users' data
	const userFilePath = userDataFolder + userInfo.user_id+".json";
	if(request.method == "GET") {
		if(!fs.existsSync(userFilePath)) {
			response.writeHead(404, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:false}));
		}else{
			const data = fs.readFileSync(userFilePath, {encoding:"utf8"});
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:true, data:JSON.parse(data)}));
		}
	
	//Update users' data
	}else if(request.method == "POST") {
		try {
			body = JSON.parse(body);
		}catch(error) {
			response.writeHead(500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({message:"Invalid body data", success:false}));
			return;
		}

		//avoid saving private data to server
		delete body.obsPass;
		delete body.oAuthToken;
		//Do not save this to the server to avoid config to be erased
		//on one of the instances
		delete body["p:hideChat"];
		
		// body.data["p:slowMode"] = true;//Uncomment to test JSON diff
	
		//Test data format
		try {
			const clone = JSON.parse(JSON.stringify(body));
			// fs.writeFileSync(userDataFolder+userInfo.user_id+"_full.json", JSON.stringify(clone), "utf8");
	
			//schemaValidator() is supposed to tell if the format is valid or not.
			//Because we enabled "removeAdditional" option, no error will be thrown
			//if a field is not in the schema. Instead it will simply remove it.
			//V9+ of the lib is supposed to allow us to retrieve the removed props,
			//but it doesn't yet. As a workaround we use JSONPatch that compares
			//the JSON before and after validation.
			//This is not the most efficient way to do this, but we have no much
			//other choice for now.
			schemaValidator(body);
			const diff = JsonPatch.compare(clone, body, false);
			if(diff?.length > 0) {
				Logger.error("Invalid format, some data has been removed from "+userInfo.login+"'s data");
				console.log(diff);
				fs.writeFileSync(userDataFolder+userInfo.user_id+"_cleanup.json", JSON.stringify(diff), "utf8");
			}
			fs.writeFileSync(userFilePath, JSON.stringify(body), "utf8");
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({success:true}));
		}catch(error){
			Logger.error("User data save failed for "+userInfo.login);
			console.log(error);
			const message = schemaValidator.errors;
			Logger.log(message);
			response.writeHead(500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({message, success:false}));
		}
	}

}

/**
 * Get user's chatters
 */
async function getChatters(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	const chattersRes = await fetch("https://tmi.twitch.tv/group/user/"+params.channel.toLowerCase()+"/chatters", {method:"GET"});
	let chatters = [];
	if(chattersRes.status === 200) {
		chatters = await chattersRes.json();
	}
	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(chatters));

}

/**
 * Get fake chat events
 */
async function getFakeEvents(request, response) {
	let json = {};
	if(fs.existsSync("fakeEvents.json")) {
		json = fs.readFileSync("fakeEvents.json", "utf8");
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(json);
}

/**
 * Get users list
 */
async function getUsers(request, response) {
	//Missing auth token
	if(!request.headers.authorization) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:false}));
		return;
	}
	
	const userInfo = await getUserFromToken(request.headers.authorization);
	if(!userInfo) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"Invalid access token", success:false}));
		return;
	}

	if(credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"You're not allowed to call this endpoint", success:false}));
		return;
	}

	const files = fs.readdirSync(userDataFolder);
	const list = files.filter(v => v.indexOf("_cleanup") == -1);
	const users = []
	list.forEach(v => {
		users.push({
			id: v.replace(".json", ""),
			date:fs.statSync(userDataFolder + v).mtime.getTime()
		})
	} );

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({success:true, users}));
}

/**
 * Get users list
 */
async function getUserData(request, response) {
	let params = UrlParser.parse(request.url, true).query;

	//Missing auth token
	if(!request.headers.authorization) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:false}));
		return;
	}
	
	const userInfo = await getUserFromToken(request.headers.authorization);
	if(!userInfo) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"Invalid access token", success:false}));
		return;
	}

	if(credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:"You're not allowed to call this endpoint", success:false}));
		return;
	}

	let file = {};
	try {
		file = JSON.parse(fs.readFileSync(userDataFolder+"/"+params.uid+".json", "utf8"));
	}catch(error){
		response.writeHead(404, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({success:false, message:"Unable to load user data file"}));
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({success:true, data:file}));
}

/**
 * Authenticate a spotify user from its auth_code
 */
async function spotifyAuthenticate(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	let clientId = params.clientId? params.clientId : credentials.spotify_client_id;
	let clientSecret = params.clientSecret? params.clientSecret : credentials.spotify_client_secret;

	const options = {
		method:"POST",
		headers: {
			"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			'grant_type': 'authorization_code',
			'code': params.code,
			'redirect_uri': credentials.spotify_redirect_uri,
		})
	}
	
	let json;
	try {
		let res = await fetch("https://accounts.spotify.com/api/token", options);
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		Logger.error("Spotify authentication failed");
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Refreshes a spotify access token
 */
async function spotifyRefreshToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	let clientId = params.clientId? params.clientId : credentials.spotify_client_id;
	let clientSecret = params.clientSecret? params.clientSecret : credentials.spotify_client_secret;

	const options = {
		method:"POST",
		headers: {
			"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			'grant_type': 'refresh_token',
			'refresh_token': params.token,
		})
	}
	
	let json;
	try {
		let res = await fetch("https://accounts.spotify.com/api/token", options);
		json = await res.json();
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		Logger.error("Spotify token refresh failed");
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

/**
 * Authenticate a deezer user from its auth_code
 */
async function deezerAuthenticate(request, response) {
	let params = UrlParser.parse(request.url, true).query;

	const options = { method:"GET" }
	let json;
	try {
		const appId = params.isProd=="1"? credentials.deezer_client_id : credentials.deezer_dev_client_id;
		const secret = params.isProd=="1"? credentials.deezer_client_secret : credentials.deezer_dev_client_secret;
		let url = "https://connect.deezer.com/oauth/access_token.php";
		url += "?code="+params.code;
		url += "&secret="+secret;
		url += "&app_id="+appId;
		url += "&output=json";
		let res = await fetch(url, options);
		json = await res.json();

		if(!json.access_token) throw(json);
	}catch(error) {
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
		Logger.error("Deezer authentication failed");
		console.log(error);
		return;
	}

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify({
		refresh_token: json.access_token,
		expires_in: json.expires,
	}));
}

/**
 * Just a proxy to load a twitch clip player source page
 * [EDIT] actually not used as the actual video is loaded asynchronously
 *        after a GQL query. To get it we would have to create a headless
 *        browser, load the page, wait for the video to load, and get its URL.
 *        No way i do this on my small server :D
 * @param {*} request 
 * @param {*} response 
 * @returns 
 */
async function twitchClip(request, response) {
	const params = UrlParser.parse(request.url, true).query;
	const id = params.id;
	const res = await fetch("https://clips.twitch.tv/"+id);
	const html = await res.text();

	response.writeHead(200, {'Content-Type': 'text/html'});
	response.end(html);
}

/**
 * Validates a token and return the user data
 */
async function getUserFromToken(token) {
	//Check access token validity
	const options = {
		method: "GET",
		headers: { "Authorization": token },
	};

	let result;
	try {
		result = await fetch("https://id.twitch.tv/oauth2/validate", options);
	}catch(error) {
		return null;
	}
	
	if(result.status == 200) {
		return await result.json();
	}else{
		return null;
	}

}


/**
 * Data schema to make sure people don't send random or invalid data to the server
 */
const UserDataSchema = {
	type:"object",
	additionalProperties: false,
	properties:{
		activityFeedFilters: {
			type:"object",
			additionalProperties: false,
			properties: {
				sub:{
					type:"boolean",
				},
				follow:{
					type:"boolean",
				},
				bits:{
					type:"boolean",
				},
				raid:{
					type:"boolean",
				},
				rewards:{
					type:"boolean",
				},
				poll:{
					type:"boolean",
				},
				prediction:{
					type:"boolean",
				},
				bingo:{
					type:"boolean",
				},
				raffle:{
					type:"boolean",
				}
			}
		},
		obsConnectionEnabled: {type:"boolean"},
		obsConf_muteUnmute: {
			type:"object",
			properties: {
				audioSourceName:{type:"string"},
				muteCommand:{type:"string"},
				unmuteCommand:{type:"string"},
			}
		},
		obsConf_permissions: {
			type:"object",
			additionalProperties: false,
			properties: {
				broadcaster: {type:"boolean"},
				mods: {type:"boolean"},
				vips: {type:"boolean"},
				subs: {type:"boolean"},
				all: {type:"boolean"},
				users: {type:"string", maxLength:1000},
			}
		},
		obsConf_scenes: {
			type:"array",
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						scene: 
						{
							type:"object",
							additionalProperties: false,
							properties:{
								sceneIndex:{type:"integer"},
								sceneName:{type:"string", maxLength:100},
							}
						},
						command:{type:"string", maxLength:100},
					}
				}
			]
		},
		triggers: {
			type:["object"],
			additionalProperties: true,
			patternProperties: {
				".*": {
					type: "object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						name: {type:"string", maxLength:100},
						chatCommand: {type:"string", maxLength:100},//Deprecated
						permissions: {
							type:"object",
							properties: {
								broadcaster: {type:"boolean"},
								mods: {type:"boolean"},
								vips: {type:"boolean"},
								subs: {type:"boolean"},
								all: {type:"boolean"},
								users: {type:"string", maxLength:1000},
							}
						},
						cooldown: {
							type:"object",
							properties: {
								global: {type:"number", minimum:0, maximum:60*60*12},
								user: {type:"number", minimum:0, maximum:60*60*12},
							}
						},
						actions:{
							type:"array",
							items: [
								{
									type: "object",
									additionalProperties: false,
									properties: {
										id: {type:"string", maxLength:100},
										sourceName: {type:"string", maxLength:100},
										show: {type:"boolean"},
										delay: {type:"number"},
										filterName: {type:"string", maxLength:100},
										text: {type:"string", maxLength:500},
										url: {type:"string", maxLength:1000},
										mediaPath: {type:"string", maxLength:1000},
										type: {type:"string", maxLength:50},
										musicAction: {type:"string", maxLength:3},
										track: {type:"string", maxLength:500},
										confirmMessage: {type:"string", maxLength:500},
										playlist: {type:"string", maxLength:500},
										voiceID: {type:"string", maxLength:100},
										triggerKey: {type:"string", maxLength:100},
										raffleData: {
											type: "object",
											additionalProperties: false,
											properties: {
												mode: {type:"string", maxLength:20},
												command: {type:"string", maxLength:100},
												duration: {type:"number", minimum:0, maximum:120},
												maxEntries: {type:"number", minimum:0, maximum:1000000},
												created_at: {type:"number", minimum:0, maximum:9999999999999},
												entries: {
													type:"array",
													items: [
														{
															type: "object",
															additionalProperties: false,
															properties: {
																id:{type:"string", maxLength:100},
																label:{type:"string", maxLength:200},
																score:{type:"number", minimum:0, maximum:100},
															}
														}
													]
												},
												followRatio: {type:"number", minimum:0, maximum:100},
												vipRatio: {type:"number", minimum:0, maximum:100},
												subRatio: {type:"number", minimum:0, maximum:100},
												subgitRatio: {type:"number", minimum:0, maximum:100},
												subMode_includeGifters: {type:"boolean"},
												subMode_excludeGifted: {type:"boolean"},
												showCountdownOverlay: {type:"boolean"},
												customEntries: {type:"string", maxLength:1000000},
											},
										},
										bingoData: {
											type: "object",
											additionalProperties: false,
											properties: {
												guessNumber: {type:"boolean"},
												guessEmote: {type:"boolean"},
												min: {type:"number", minimum:0, maximum:999999999},
												max: {type:"number", minimum:0, maximum:999999999},
											}
										}
									}
								},
							]
						}
					}
				},
			}
		},
		botMessages: {
			type:"object",
			additionalProperties: false,
			properties: {
				raffleStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				raffleJoin: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				raffle: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				bingoStart: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				bingo: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
				shoutout: {
					type:"object",
					additionalProperties: false,
					properties: {
						enabled: {type:"boolean"},
						message: {type:"string", maxLength:1000},
					}
				},
			}
		},
		voiceActions: {
			type:"array",
			items: [
				{
					type: "object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:100},
						sentences: {type:"string", maxLength:1000},
					}
				},
			]
		},
		voiceLang: {type:"string"},
		"streamInfoPresets":{
			type:"array",
			items:[
				{
					type:"object",
					additionalProperties: false,
					properties:{
						name:{type:"string", maxLength:50},
						id:{type:"string", maxLength:10},
						title:{type:"string", maxLength:200},
						categoryID:{type:"string", maxLength:10},
						tagIDs:{
							type:"array",
							items:[{type:"string", maxLength:50}],
						},
					}
				}
			]
		},
		"p:blockedCommands": {type:"string"},
		"p:bttvEmotes": {type:"boolean"},
		"p:ffzEmotes": {type:"boolean"},
		"p:sevenTVEmotes": {type:"boolean"},
		"p:censorDeletedMessages": {type:"boolean"},
		"p:censoreDeletedMessages": {type:"boolean"},
		"p:conversationsEnabled": {type:"boolean"},
		"p:defaultSize": {type:"integer", minimum:0, maximum:5},
		"p:displayTime": {type:"boolean"},
		"p:firstMessage": {type:"boolean"},
		"p:firstTimeMessage": {type:"boolean"},
		"p:groupIdenticalMessage": {type:"boolean"},
		"p:hideUsers": {type:"string"},
		"p:highlightMentions": {type:"boolean"},
		"p:highlightMods": {type:"boolean"},
		"p:highlightNonFollowers": {type:"boolean"},
		"p:highlightSubs": {type:"boolean"},
		"p:highlightVips": {type:"boolean"},
		"p:historySize": {type:"integer", minimum:50, maximum:500},
		"p:ignoreCommands": {type:"boolean"},
		"p:ignoreListCommands": {type:"boolean"},
		"p:keepDeletedMessages": {type:"boolean"},
		"p:keepHighlightMyMessages": {type:"boolean"},
		"p:lockAutoScroll": {type:"boolean"},
		"p:markAsRead": {type:"boolean"},
		"p:minimalistBadges": {type:"boolean"},
		"p:notifyJoinLeave": {type:"boolean"},
		"p:raidHighlightUser": {type:"boolean"},
		"p:raidStreamInfo": {type:"boolean"},
		"p:receiveWhispers": {type:"boolean"},
		"p:showWhispersOnChat": {type:"boolean"},
		"p:showBadges": {type:"boolean"},
		"p:showBots": {type:"boolean"},
		"p:showCheers": {type:"boolean"},
		"p:showEmotes": {type:"boolean"},
		"p:showFollow": {type:"boolean"},
		"p:showHypeTrain": {type:"boolean"},
		"p:showModTools": {type:"boolean"},
		"p:splitViewVertical": {type:"boolean"},
		"p:showWhispersOnChat": {type:"boolean"},
		"p:showNotifications": {type:"boolean"},
		"p:showRaids": {type:"boolean"},
		"p:showRewards": {type:"boolean"},
		"p:showRewardsInfos": {type:"boolean"},
		"p:showSelf": {type:"boolean"},
		"p:showSlashMe": {type:"boolean"},
		"p:showSubs": {type:"boolean"},
		"p:showUserPronouns": {type:"boolean"},
		"p:showViewersCount": {type:"boolean"},
		"p:splitView": {type:"boolean"},
		"p:splitViewSwitch": {type:"boolean"},
		"p:stopStreamOnRaid": {type:"boolean"},
		"p:userHistoryEnabled": {type:"boolean"},
		"p:translateNames": {type:"boolean"},
		"p:spoilersEnabled": {type:"boolean"},
		"p:alertMode": {type:"boolean"},
		v: {type:"integer"},
		obsIP: {type:"string"},
		obsPort: {type:"integer"},
		updateIndex: {type:"integer"},
		raffle_message: {type:"string"},
		raffle_messageEnabled: {type:"boolean"},
		bingo_message: {type:"string"},
		bingo_messageEnabled: {type:"boolean"},
		greetScrollDownAuto: {type:"boolean"},
		greetAutoDeleteAfter: {type:"integer", minimum:-1, maximum:3600},
		devmode: {type:"boolean"},
		greetHeight: {type:"number"},
		leftColSize: {type:"number"},
		cypherKey: {type:"string"},
		raffle_showCountdownOverlay: {type:"boolean"},
		"p:emergencyButton": {type:"boolean"},//Keep it a little to avoid loosing data, remove it later
		ttsParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				volume: {type:"number", minimum:0, maximum:1},
				rate: {type:"number", minimum:0.1, maximum:10},
				pitch: {type:"number", minimum:0, maximum:2},
				maxLength: {type:"integer", minimum:0, maximum:500},
				maxDuration: {type:"integer", minimum:0, maximum:120},
				timeout: {type:"integer", minimum:0, maximum:300},
				inactivityPeriod: {type:"integer", minimum:0, maximum:60},
				voice: {type:"string", maxLength:500},
				removeURL: {type:"boolean"},
				replaceURL: {type:"string", maxLength:100},
				removeEmotes: {type:"boolean"},
				readMessages:{type:"boolean"},
				readMessagePatern: {type:"string", maxLength:300},
				readWhispers:{type:"boolean"},
				readWhispersPattern: {type:"string", maxLength:300},
				readNotices:{type:"boolean"},
				readNoticesPattern: {type:"string", maxLength:300},
				readRewards: {type:"boolean"},
				readRewardsPattern: {type:"string", maxLength:300},
				readSubs: {type:"boolean"},
				readSubsPattern:{type:"string", maxLength:300},
				readSubgifts: {type:"boolean"},
				readSubgiftsPattern:{type:"string", maxLength:300},
				readBits: {type:"boolean"},
				readBitsMinAmount: {type:"number", minimum:0, maximum:1000000},
				readBitsPattern:{type:"string", maxLength:300},
				readRaids: {type:"boolean"},
				readRaidsPattern:{type:"string", maxLength:300},
				readFollow: {type:"boolean"},
				readFollowPattern:{type:"string", maxLength:300},
				readPolls: {type:"boolean"},
				readPollsPattern:{type:"string", maxLength:300},
				readPredictions: {type:"boolean"},
				readPredictionsPattern:{type:"string", maxLength:300},
				readBingos: {type:"boolean"},
				readBingosPattern:{type:"string", maxLength:300},
				readRaffle: {type:"boolean"},
				readRafflePattern:{type:"string", maxLength:300},
				ttsPerms:{
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},
		emergencyParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled:{type:"boolean"},
				chatCmd:{type:"string", maxLength:100},
				chatCmdPerms:{
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
				slowMode:{type:"boolean"},
				emotesOnly:{type:"boolean"},
				subOnly:{type:"boolean"},
				followOnly:{type:"boolean"},
				noTriggers:{type:"boolean"},
				followOnlyDuration:{type:"number"},
				slowModeDuration:{type:"number"},
				toUsers:{type:"string"},
				obsScene:{type:"string"},
				obsSources:{
					type:"array",
					items:[{type:"string", maxLength:100}],
				},
				autoBlockFollows:{type:"boolean"},
				autoUnblockFollows:{type:"boolean"},
				autoEnableOnFollowbot:{type:"boolean"},
			}
		},
		emergencyFollowers: {
			type:"object",
			additionalProperties: false,
			properties: {
				uid:{type:"string", maxLength:50},
				login:{type:"string", maxLength:50},
				date:{type:"number"},
				blocked:{type:"boolean"},
				unblocked:{type:"boolean"},
			}
		},
		spoilerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				permissions:{
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},
		chatHighlightParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				position:{type:"string", maxLength:2},
			}
		},
		
		chatAlertParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				chatCmd:{type:"string", maxLength:100},
				message: {type:"boolean"},
				shake: {type:"boolean"},
				sound: {type:"boolean"},
				blink: {type:"boolean"},
				permissions:{
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},
		
		musicPlayerParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				noScroll: {type:"boolean"},
				autoHide: {type:"boolean"},
				erase: {type:"boolean"},
				showCover: {type:"boolean"},
				showArtist: {type:"boolean"},
				showTitle: {type:"boolean"},
				showProgressbar: {type:"boolean"},
				openFromLeft: {type:"boolean"},
				customInfoTemplate: {type:"string", maxLength:5000},
			}
		},

		voicemodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				voiceIndicator: {type:"boolean"},
				commandToVoiceID:{
					type:"object",
					additionalProperties: true,
					patternProperties: {
						".*": {type:"string", maxLength:100},
					}
				},
				chatCmdPerms:{
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
			}
		},

		automodParams: {
			type:"object",
			additionalProperties: false,
			properties: {
				enabled: {type:"boolean"},
				banUserNames: {type:"boolean"},
				exludedUsers: {
					type:"object",
					additionalProperties: false,
					properties: {
						broadcaster: {type:"boolean"},
						mods: {type:"boolean"},
						vips: {type:"boolean"},
						subs: {type:"boolean"},
						all: {type:"boolean"},
						users: {type:"string", maxLength:1000},
					}
				},
				keywordsFilters:{
					type:"object",
					additionalProperties: false,
					properties: {
						id: {type:"string", maxLength:36},
						label: {type:"string", maxLength:100},
						regex: {type:"string", maxLength:5000},
						enabled: {type:"boolean"},
						serverSync: {type:"boolean"},
					}
				},
			}
		}
	}
}

const ajv = new Ajv({strictTuples: false, verbose:true, removeAdditional:true, discriminator:true })
const schemaValidator = ajv.compile( UserDataSchema );