/**
 * This process downloads all youtube emotes defined on emote_list.json.
 * Emotes are downloaded to static/youtube folder
 * 
 * To generate the emote_list.json file, go on a youtube live stream, open
 * the emote selector, and run this on the console:
 * (it may be necessary to reduce the window size width to switch to mobile mode to get proper CSS selector)
let emojis = document.querySelectorAll(".yt-emoji-picker-category-renderer");
let map = {};
for(var i = 0; i < emojis.length; i++) {
	if(emojis[i].getAttribute("src") === null) continue;
	map[emojis[i].getAttribute("aria-label")] = emojis[i].getAttribute("src");
}
console.log(map)
 */
const fs = require("fs");
const path = require("path");

// import * as fs from "fs";
// import * as path from "path";
// import {fileURLToPath} from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const emoteFolder = path.join(__dirname, "../static/youtube/emotes");
const secretEmotes = path.join(__dirname, "./secret_emotes.json");

if(!fs.existsSync(emoteFolder)) {
	fs.mkdirSync(emoteFolder, {recursive:true});
}
if(!fs.existsSync(emoteFolder+"/sd")) fs.mkdirSync(emoteFolder+"/sd", {recursive:true});
if(!fs.existsSync(emoteFolder+"/hd")) fs.mkdirSync(emoteFolder+"/hd", {recursive:true});

(async() => {
	const json = fs.readFileSync(path.join(__dirname, "./emote_list.json"), "utf-8");
	const emotelist = JSON.parse(json);

	if(fs.existsSync(secretEmotes)) {
		//Merge undocumented emotes to the global list
		const emotes = JSON.parse(fs.readFileSync(secretEmotes, "utf-8"));
		for (const key in emotes) {
			emotelist[key] = emotes[key];
		}
	}
	
	const emoteMap = {};
	for (const key in emotelist) {
		//Ignore SVGs that are standard emotes probably handled by fonts
		if(/.*\.svg/.test(emotelist[key])) continue;

		const fileName = key.replace(/\W/gi,"")+".png";
		const filePathSD = path.join(emoteFolder, "/sd/"+fileName);
		if(!fs.existsSync(filePathSD)) {
			const responseSD = await fetch(emotelist[key]);
			const blobSD = await (await responseSD.blob()).arrayBuffer();
			const bufferSD = Buffer.from(blobSD);
			fs.writeFileSync(filePathSD, bufferSD);
		}
		
		const filePathHD = path.join(emoteFolder, "/hd/"+fileName);
		if(!fs.existsSync(filePathHD)) {
			const responseHD = await fetch(emotelist[key].replace("w24-h24", "w112-h112"));
			const blobHD = await (await responseHD.blob()).arrayBuffer();
			const bufferHD = Buffer.from(blobHD);
			fs.writeFileSync(filePathHD, bufferHD);
		}

		emoteMap[key] = fileName;
	}
	
	fs.writeFileSync(path.join(emoteFolder, "../emote_list.json"), JSON.stringify(emoteMap), 'utf-8');
})();