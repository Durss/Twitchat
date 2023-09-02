const { app, BrowserWindow } = require('electron');
const path = require("path");
const httpProxy = require('http-proxy');

let proxy;
let shouldConnect = false;

const createWindow = () => {
	const win = new BrowserWindow({
		width: 300,
		height: 200,
		frame: false,
		transparent: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	})

	win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})


// Require the framework and instantiate it
const server = require('fastify')({ logger: false })
server.get('/', async (request, response) => { return "Server ready"; })
server.post('/ip', async (request, response) => {
	shouldConnect = true;
	const json = JSON.parse(request.body);
	console.log(json);
	startWebsocketProxies(json.ip);
	response.status(200).send();
});
server.post('/disconnect', async (request, response) => {
	shouldConnect = false;
	if(proxy) proxy.close();
	response.status(200).send();
});


server.listen({port:8253, host:'0.0.0.0'}).catch((err)=> {
	console.log(err);
	process.exit(1)
});

//*
function startWebsocketProxies(ip) {
	/**
	 * GOXLR proxy
	 */
	proxy = httpProxy.createServer({
		target: 'ws://'+ip+':14564',
		ws: true
	}).on('error', (err) => {
		proxy.close();
		if(shouldConnect) {
			setTimeout(()=> {
				startWebsocketProxies();
			}, 1000)
		}
	}).on("open", ()=> {
		console.log("Opened");
	}).on("proxyReqWs", (req) => {
		// console.log("Forward WS");
	})
	.listen(14564);

	/**
	 * OBS websocket proxy
	 */
	proxy = httpProxy.createServer({
		target: 'ws://'+ip+':4455',
		ws: true
	}).on('error', (err) => {
		proxy.close();
		if(shouldConnect) {
			setTimeout(()=> {
				startWebsocketProxies();
			}, 1000)
		}
	}).on("open", ()=> {
		console.log("Opened");
	}).on("proxyReqWs", (req) => {
		// console.log("Forward WS");
	})
	.listen(4455);
}
// startWebsocketProxy("192.168.1.13");
//*/
