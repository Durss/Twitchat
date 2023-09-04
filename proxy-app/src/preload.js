// boilerplate code for electron...
const {
	contextBridge,
	ipcRenderer
} = require("electron");

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector)
		if (element) element.innerText = text
	}

	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, process.versions[type])
	}
})

// end boilerplate code, on to your stuff..

/**
 * HERE YOU WILL EXPOSE YOUR 'myfunc' FROM main.js
 * TO THE FRONTEND.
 * (remember in main.js, you're putting preload.js
 * in the electron window? your frontend js will be able
 * to access this stuff as a result.
 */
contextBridge.exposeInMainWorld("api", {
	invoke: (channel, data) => {
		let validChannels = ["disconnect", "connect", "close", "minimize"]; // list of ipcMain.handle channels you want access in frontend to
		if (validChannels.includes(channel)) {
			// ipcRenderer.invoke accesses ipcMain.handle channels like 'myfunc'
			// make sure to include this return statement or you won't get your Promise back
			return ipcRenderer.invoke(channel, data);
		}
	},
	onConnecting: (callback) => ipcRenderer.on('on:connecting', callback),
	onConnect: (callback) => ipcRenderer.on('on:connect', callback),
	onDisconnect: (callback) => ipcRenderer.on('on:disconnect', callback),
	onData: (callback) => ipcRenderer.on('on:data', callback),
	onNeedsAuth: (callback) => ipcRenderer.on('on:needsAuth', callback),
}
);