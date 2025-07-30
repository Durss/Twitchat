import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
	input: './src_lande/lande_worker.ts', // Path to your worker TypeScript file
	output: {
		file: './static/lande_worker.js',
		format: 'iife', // Immediately Invoked Function Expression
	},
	plugins: [
		resolve(),       // Locate and bundle dependencies in node_modules
		commonjs(),      // Convert CommonJS modules to ES6
		typescript({     // Compile TypeScript files
			tsconfig: './tsconfig_lande.json',
		}),
	],
};
