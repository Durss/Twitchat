/**
 * Takes all SVG icons from src_front/assets/icons folder and create
 * sub folders for every specified themes with coulored versions of the SVGs
 */
const fs = require("fs");
const path = require("path");

const themes = [
	{name:"primary", color:"#078769"},
	{name:"secondary", color:"#e04e00"},
	{name:"alert", color:"#b71f1f"},
]
const root = path.join(__dirname, "../src_front/assets/icons");
const files = fs.readdirSync(root);

//Cleanup previous themes folders
for (let i = 0; i < files.length; i++) {
	const filePath = root+"/"+files[i];
	if(fs.lstatSync(filePath).isDirectory()) {
		fs.rmdirSync(filePath, {recursive:true});
		files.splice(i, 1);
		i--;
	}
}

//Create all themed SVGs
for (let i = 0; i < themes.length; i++) {
	const theme = themes[i];
	const folder = root+"/"+theme.name;
	//Create theme folder
	fs.mkdirSync(folder);
	//Create all themed SVGs
	for (let j = 0; j < files.length; j++) {
		const file = files[j];
		let text = fs.readFileSync(root+"/"+file, "utf-8");
		text = text.replace(/#ffffff/gi, theme.color);
		fs.writeFileSync(folder+"/"+file, text);
	}
}