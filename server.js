//DIRTY ASS LAZY SERVER !
//Will do that properly someday :3
const statik = require('node-static');
const fs = require('fs');
const fileServer = new statik.Server('./dist');
const http = require('http');
const UrlParser = require('url');
const fetch = require('node-fetch');

console.log("=============");
console.log("Server stated");
console.log("=============");


let credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));

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
			
			//Generate token from auth code
			if(request.url.indexOf("api/gettoken") > -1) {
				generateToken(request, response);

			//Refresh access token
			}else if(request.url.indexOf("api/refreshtoken") > -1) {
				refreshToken(request, response);
			
				//Endpoint not found
			}else{
				response.writeHead(404, {'Content-Type': 'application/json'});
				response.end(JSON.stringify({error: "This endpoint does not exist"}));
			}
		}else{
			fileServer.serve(request, response, (err, result) => {
				if (err) {
					console.error(
						"Error serving " + request.url + " - " + err.message
					);
					fileServer.serveFile(
						'/index.html', 200, {}, request, response
					);
				}
			});
		}
	}).resume();
}).listen(3018);


async function generateToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
    url += "?client_id="+credentials.client_id;
    url += "&client_secret="+credentials.client_secret;
    url += "&code="+params.code;
    url += "&grant_type=authorization_code";
    url += "&redirect_uri="+credentials.redirect_uri;
	
	let res = await fetch(url, {method:"POST"});
	let json = await res.json();

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}

async function refreshToken(request, response) {
	let params = UrlParser.parse(request.url, true).query;
	
	let url = "https://id.twitch.tv/oauth2/token";
    url += "?client_id="+credentials.client_id;
    url += "&client_secret="+credentials.client_secret;
    url += "&refresh_token="+params.token;
    url += "&grant_type=refresh_token";
	
	let res = await fetch(url, {method:"POST"});
	let json = await res.json();

	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(json));
}