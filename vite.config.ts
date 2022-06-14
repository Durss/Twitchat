import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2020'
		}
	},
	build: {
		target: 'es2020'
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},

	css: {
		preprocessorOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 7.0.1
				additionalData: `
					@import "./src/less/index.less";
					@import "./src/less/_includes.less";
				`
			}
		}
	}
});