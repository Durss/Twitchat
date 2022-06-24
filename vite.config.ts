import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
	server:{
		port:8080,
	},

	plugins: [vue()],

	optimizeDeps: {
		// exclude: ['tmi.js'],
		esbuildOptions: {
			target: 'es2020'
		}
	},

	build: {
		target: 'es2020',
        sourcemap: true,
	},

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},

	css: {
		preprocessorOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 8.0.0
				additionalData: `
					@import "./src/less/index.less";
					@import "./src/less/_includes.less";
				`
			}
		}
	}
});