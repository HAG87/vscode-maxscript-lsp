/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/
// /** @typedef {import('tsconfig-paths-webpack-plugin').TsconfigPathsPlugin} TsconfigPaths **/
'use strict';

const path = require('path');
const mergeOptions = require('merge-options');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
// import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
// const nodeExternals = require('webpack-node-externals');

module.exports = function withDefaults(/**@type WebpackConfig*/extConfig) {

	/** @type WebpackConfig */
	let defaultConfig = {
		mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
		target: 'node', // extensions run in a node context
		// /*
		node: {
			__dirname: false // leave the __dirname-behaviour intact
		},
		// */
		resolve: {
			mainFields: ['module', 'main'],
			extensions: ['.ts', '.tsx', '.js', '.jsx'],
			modules: [path.resolve(__dirname, 'src'), 'node_modules', path.resolve(__dirname)],
			/*
			plugins: [
				//@ts-expect-error
				new TsconfigPathsPlugin({
					extensions: ['.ts', '.tsx', '.js', '.jsx'],
					mainFields: ['module', 'main'],
				})]
				*/
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					exclude: /node_modules/,
					use: [{
						// loader: require.resolve('ts-loader'),
						loader: 'ts-loader',
						// configure TypeScript loader:
						// * enable sources maps for end-to-end source maps
						options: {
							// context: __dirname,
							// configFile: require.resolve('tsconfig.base'),
							compilerOptions: {
								'sourceMap': true,
								// 'onlyCompileBundledFiles': true,
								'projectReferences': true
							}
						}
					}]
				},
				/*
				{
					test: /\.js$/,
					type: 'javascript/esm',
					include: /node_modules/
				},
				*/
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
		// yes, really source maps
		devtool: 'source-map'
	};

	// @ts-ignore
	return mergeOptions(defaultConfig, extConfig);
};