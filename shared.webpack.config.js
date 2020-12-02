/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/
'use strict';

const path = require('path');
const mergeOptions = require('merge-options');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
// import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';

module.exports = function withDefaults(/**@type WebpackConfig*/extConfig) {
	/** @type WebpackConfig */
	let defaultConfig = {
		mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
		target: 'node', // extensions run in a node context
		/* node: {
			__dirname: false // leave the __dirname-behaviour intact
		}, */
		node: false,
		resolve: {
			mainFields: ['module', 'main'],
			extensions: ['.ts', '.tsx', '.js', '.jsx'],
			modules: ['node_modules', path.resolve(__dirname)],
			plugins: [
				//@ts-expect-error
				new TsconfigPathsPlugin({
					extensions: ['.ts', '.tsx', '.js', '.jsx'],
					mainFields: ['module', 'main'],
				})]
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					exclude: /node_modules/,
					use: [{
						loader: 'ts-loader',
						options: {
							// configure TypeScript loader:
							// * enable sources maps for end-to-end source maps
							// compilerOptions: {
							// 'sourceMap': true,
							// 'allowJs': false,
							// },
							projectReferences: true,
							// transpileOnly: false,
							// onlyCompileBundledFiles: true,
						}
					}]
				},
			]
		},
		externals:
		{
			'vscode': 'commonjs vscode' // ignored because it doesn't exist
		},
		output: {
			filename: '[name].js',
			path: path.join(extConfig.context, 'out'),
			libraryTarget: 'commonjs',
			// chunkFilename: '[name].js',
		},
		devtool: 'source-map'
	};
	// @ts-ignore
	return mergeOptions(defaultConfig, extConfig);
};