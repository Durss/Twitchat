//DIRTY ASS LAZY SERVER !
//Will do that properly someday :3
const statik = require('node-static');
const fs = require('fs');
const fileServer = new statik.Server('./dist');
const http = require('http');
const UrlParser = require('url');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

console.log("=============");
console.log("Server stated");
console.log("=============");


let credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
let credentialToken = null;
let credentialToken_invalidation_date = 0;

http.createServer((request, response) => {

	request.addListener('end', () => {
		if(credentials.redirect_uri.indexOf(request.headers.host.replace(/:[0-9]+/gi, "")) > -1) {
			//Set CORS headers if host is found on the redirect URI
			response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
			response.setHeader('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN');
			response.setHeader('Access-Control-Allow-Origin', "*");
		}
		if(request.method == "OPTION") {
			response.end("OK");
			return;
		}
		if(request.url.indexOf("api") > -1) {
			
			//Get client ID
			if(request.url.indexOf("api/configs") > -1) {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({client_id:credentials.client_id, scopes:credentials.scopes}));
				return;
			
			//Generate token from auth code
			}else if(request.url.indexOf("api/gettoken") > -1) {
				generateToken(request, response);
				return;
			
			//Generate token from auth code
			}else if(request.url.indexOf("api/CSRFToken") > -1) {
				CSRFToken(request, response);
				return;
			
			//Generate token from auth code
			}else if(request.url.indexOf("api/user") > -1) {
				getUserInfos(request, response);
				return;
			
			//Get fake chat events
			}else if(request.url.indexOf("api/fakeevents") > -1) {
				getFakeEvents(request, response);
				return;

			//Refresh access token
			}else if(request.url.indexOf("api/refreshtoken") > -1) {
				refreshToken(request, response);
				return;
			
				//Endpoint not found
			}else{
				response.writeHead(404, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({error: "This endpoint does not exist"}));
				return;
			}
		}else{
			fileServer.serve(request, response, (err, result) => {
				if (err) {
					if(request.url.toLowerCase().indexOf("oauth") == -1
					&& request.url.toLowerCase().indexOf("chat") == -1) {
						console.error(
							"Error serving " + request.url + " - " + err.message
						);
					}
					fileServer.serveFile(
						'/index.html', 200, {}, request, response
					);
				}
			});
		}
	}).resume();
}).listen(3018);


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
		console.log(error);
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
 * Get a user's infos
 * 
 * @param {*} request 
 * @param {*} response 
 */
async function getUserInfos(request, response) {
	const token = await getClientCredentialToken();
	let queryParams = UrlParser.parse(request.url, true).query;

	let headers = {
		"Client-Id":credentials.client_id,
		"Authorization":"Bearer "+token
	};
	var options = {
		method: "GET",
		headers: headers,
	};
	const params = "login="+queryParams.logins.split(",").join("&login=");
	let result = await fetch("https://api.twitch.tv/helix/users?"+params, options)
	if(result.status == 200) {
		let json = await result.json();
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(json.data));
	}else{
		response.writeHead(500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify({message:'error', success:false}));
	}
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
 * Generates a credential token.
 * 
 * @param client_id 
 * @param client_secret 
 * @param scope 
 * @returns 
 */
async function getClientCredentialToken() {
	//Invalidate token if expiration date is passed
	if(Date.now() > credentialToken_invalidation_date) credentialToken = null;
	//Avoid generating a new token if one already exists
	if(credentialToken) return Promise.resolve(credentialToken);

	//Generate a new token
	let headers = {};
	var options = {
		method: "POST",
		headers: headers,
	};
	let url = "https://id.twitch.tv/oauth2/token?";
	url += "client_id="+credentials.client_id;
	url += "&client_secret="+credentials.client_secret;
	url += "&grant_type=client_credentials";
	url += "&scope="+credentials.scopes.join("+");

	try {
		const result = await fetch(url, options);
		if(result.status == 200) {
			let json = await result.json();
			credentialToken = json.access_token;
			credentialToken_invalidation_date = Date.now() + json.expires_in - 1000;
			return json.access_token;
		}else{
			console.error("Token generation failed");
			console.log(await result.text());
			return null;
		}
	}catch(error) {
		return null;
	}
}