const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron');
const path = require("path");
const httpProxy = require('http-proxy');

let mainWindow;
let proxyList = {};

/**
 * Create electron app
 */
		const createWindow = () => {
			mainWindow = new BrowserWindow({
				width: 520,
				height: 320,
				frame: false,
				transparent: true,
				webPreferences: {
					// nodeIntegration: true,
					// contextIsolation: true,
					// enableRemoteModule: true,
					preload: path.join(__dirname, 'preload.js')
				}
			});

			let tray = null;
			mainWindow.on('minimize', function (event) {
				event.preventDefault();
				mainWindow.setSkipTaskbar(true);
				tray = createTray();
			});

			mainWindow.on('restore', function (event) {
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
					label: 'Show', click: function () {
						mainWindow.show();
					}
				},
				{
					label: 'Exit', click: function () {
						app.isQuiting = true;
						app.quit();
					}
				}
			]);
		
			appIcon.on('double-click', function (event) {
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
			if(proxyList[arg.ip+"_"+arg.port]) return {success:true};

			const success = await createProxy(arg.ip, arg.port).catch(error=>{console.log("Error", error)});
			return {success};
		});
		ipcMain.handle('disconnect', async (event, arg) => {
			const key = arg.ip+"_"+arg.port;
			if(proxyList[key]) {
				proxyList[key].close();
				delete proxyList[key];
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
		function createProxy(ip, port) {
			return new Promise((resolve, reject)=> {
				let reconnectTimeout = -1;
				const proxy = httpProxy.createProxyServer({
					target: {
						protocol: 'ws:',
						host: ip,
						port: port
					  },
					ws: true,
					timeout:1000,
					proxyTimeout:1000,
				});
				proxy.on('error', (error) => {
					console.log(error);
					// if(proxy) proxy.close();
					if (proxyList[ip+"_"+port]) {
						delete proxyList[ip+"_"+port];
						clearTimeout(reconnectTimeout);
						reconnectTimeout = setTimeout(() => {
							createProxy(ip, port).then((()=>{
								resolve(true);
							})).catch((()=>{
								resolve(false);
							}));
						}, 1000);
					}else{
						proxy.close();
						resolve(false);
					}
				}).on("open", () => {
					proxyList[ip+"_"+port] = proxy;
					resolve(true);
				}).on("close", () => {
					delete proxyList[ip+"_"+port];
				}).on("proxyReqWs", (req) => {
					// console.log("Forward WS");
				})
				.listen(port);
			})
		}