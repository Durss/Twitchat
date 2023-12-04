module.exports = {
	presets: [
		'@vue/cli-plugin-babel/preset'
	],
	plugsins: [
		["@babel/plugin-proposal-decorators", { "legacy": true }],
		["@babel/plugin-proposal-class-properties", { "loose": true }]
	]
}
