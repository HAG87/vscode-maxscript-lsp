/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

'use strict';

const path = require('path');
const mergeOptions = require('merge-options');
// const nodeExternals = require('webpack-node-externals');

module.exports = function withDefaults(/**@type WebpackConfig*/extConfig) {

	/** @type WebpackConfig */
	let defaultConfig = {
		mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
		target: 'node', // extensions run in a node context
		node: {
			__dirname: false // leave the __dirname-behaviour intact
		},
		resolve: {
			mainFields: ['module', 'main'],
			extensions: ['.ts', '.js'],
			alias: {
				// 'node_modules': path.join(__dirname, '/node_modules/'),
			}
		},
		module: {
			rules: [{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [{
					// configure TypeScript loader:
					// * enable sources maps for end-to-end source maps
					loader: 'ts-loader',
					options: {
						compilerOptions: {
							'sourceMap': true,
						}
					}
				}]
			},
			{
				test: /node_modules/,
				use: 'umd-compat-loader'
			}]
		},
		externals:
		{
			'vscode': 'commonjs vscode' // ignored because it doesn't exist
		},
		output: {
			filename: '[name].js',
			chunkFilename: '[name].js',
			path: path.join(extConfig.context, 'out'),
			libraryTarget: 'commonjs2',
		},
		// yes, really source maps
		devtool: 'source-map'
	};

	// @ts-ignore
	return mergeOptions(defaultConfig, extConfig);
};