const path = require('path');

module.exports = {

	configureWebpack: {
		resolve: {
			alias: {
				'@': __dirname + '/src'
			}
		},
		entry: {
			app: './src/main.ts'
		},
		optimization: {
			minimize: false,//Avoids minifying the index which would break share meta for whatsapp
			splitChunks: {
				// minSize: 10000,
				// maxSize: 250000,
				cacheGroups: {
					commons: {
						test: /[\\/]node_modules[\\/]/,
						name: 'vendors',
						chunks: 'all'
					}
				}
			}
		}
	},

	css: {
		loaderOptions: {
			less: {
				//Requires proper version of less-loader to work. Tested with 7.0.1
				additionalData: `
					@import "@/less/index.less";
					@import "@/less/_includes.less";
				`
			}
		}
	}
}