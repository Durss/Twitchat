const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron');
const path = require("path");
const httpProxy = require('http-proxy');
// const msgpack = require('@msgpack/msgpack');
// const sha256 = require("crypto-js/sha256.js");
// const Base64 = require("crypto-js/enc-base64.js");

let mainWindow;
let proxyList = {};
let socketConnections = {};

/**
 * Create electron app
 */
		const createWindow = () => {
			mainWindow = new BrowserWindow({
				width: 500,
				height: 270,
				frame: false,
				transparent: true,
				webPreferences: {
					preload: path.join(__dirname, 'preload.js')
				}
			});

			let tray = null;
			mainWindow.on('minimize', (event) => {
				event.preventDefault();
				mainWindow.setSkipTaskbar(true);
				tray = createTray();
			});

			mainWindow.on('restore', (event) => {
				mainWindow.show();
				mainWindow.setSkipTaskbar(false);
				tray.destroy();
			});

			mainWindow.loadFile(path.join(__dirname, "index.html"));
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

		/**
		 * Create tray menu
		 */
		function createTray() {
			let appIcon = new Tray(path.join(__dirname, "assets/tray.ico"));
			const contextMenu = Menu.buildFromTemplate([
				{
					label: 'Show', click: () => {
						mainWindow.show();
					}
				},
				{
					label: 'Exit', click: () => {
						app.isQuiting = true;
						app.quit();
					}
				}
			]);
		
			appIcon.on('double-click', (event) => {
				mainWindow.show();
			});
			appIcon.setToolTip('Tray Tutorial');
			appIcon.setContextMenu(contextMenu);
			return appIcon;
		}

/**
 * Methods exposed to frontend.
 * Declare them in preload.js
 */
		ipcMain.handle('connect', async (event, arg) => {
			if(socketConnections[arg.ip+"_"+arg.port]) return {success:true};

			createProxy(arg.ip, arg.port, arg.id);
			return;
		});
		ipcMain.handle('disconnect', async (event, arg) => {
			const id = arg.id;
			if(socketConnections[id]) {
				closeProxy(id);
			}
		});
		ipcMain.handle('minimize', async (event, arg) => {
			mainWindow.minimize();
		});
		ipcMain.handle('close', async (event, arg) => {
			mainWindow.close();
		});




/**
 * Create Websocket proxies
 */
		function createProxy(ip, port, id) {
			console.log("Create proxy", id, ip, port);
			mainWindow.webContents.send('on:connecting', id);
			//Handle custom timeout as for some socket ports the
			//connection keeps hanging with no timeout...
			const timeout = setTimeout(()=> {
				closeProxy(id);
			}, 15000);
			let reconnectTimeout = -1;
			const proxy = httpProxy.createProxyServer({
				target: {
					protocol: 'ws:',
					host: ip,
					port: port
					},
				logs:true,
				ws: true
			});
			proxyList[id] = proxy;
			proxy.on('error', (error) => {
				clearTimeout(timeout);
				clearTimeout(reconnectTimeout);
				mainWindow.webContents.send('on:disconnect', id);
				// if(proxy) proxy.close();
				if (socketConnections[id]) {
					delete proxyList[id];
					delete socketConnections[id];
					reconnectTimeout = setTimeout(() => {
						createProxy(ip, port);
					}, 1000);
				}else{
					proxy.close();
				}
			})
			.on("upgrade", (socket) => {
				console.log("on upgrade", id);
			})
			.on("open", (socket) => {
				console.log("Proxy created", id, ip, port);
				clearTimeout(timeout);

				socketConnections[id] = socket;
				socket.addListener("data", async (data)=> {
					//Dunno why i need to ignore first 4 bytes...
					let res = data.subarray(4, data.length).toString();
					try {
						const json = JSON.parse(res);
						if(json.op === 0 && json.d?.authentication) {
							mainWindow.webContents.send('on:needsAuth', id);
							//Attempt at authenticating to secured OBS-ws.. failed T_T
							// const pass = "xxx";
							// const hash = Base64.stringify(sha256(pass + json.d.authentication.salt));
							// const authKey = Base64.stringify(sha256(hash + json.d.authentication.challenge));
							// const message = msgpack.encode({
							// 	"op": 1,
							// 	"d": {
							// 	  "rpcVersion": 1,
							// 	  "authentication": authKey
							// 	}
							//   });
							// console.log(message);
							// socket.send(message);
						}
					}catch(error){}
				});
				mainWindow.webContents.send('on:connect', id);
			})
			.on("close", () => {
				closeProxy(id);
			})
			.on("proxyReqWs", (req) => {
				console.log("Forward");
				mainWindow.webContents.send('on:data', id);
			})
			.listen(port);
		}

		function closeProxy(id) {
			if(proxyList[id]) proxyList[id].close();
			if(socketConnections[id]) socketConnections[id].end();
			delete proxyList[id];
			delete socketConnections[id];
			mainWindow.webContents.send('on:disconnect', id);
		}