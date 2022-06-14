module.exports = {
	"root": true,
	"extends": [
		"plugin:vue/vue3-essential",
		"eslint:recommended",
		"@vue/eslint-config-typescript/recommended"
	],
	"env": {
		"vue/setup-compiler-macros": true
	},
	"rules": {
		"@typescript-eslint/ban-ts-comment": "off"
	}
}
