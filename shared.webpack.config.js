/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require('path');
const mergeOptions = require('merge-options');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
// const HtmlWebpackPlugin = require("html-webpack-plugin");

/**@type function(WebpackConfig): WebpackConfig*/
module.exports = function withDefaults(/**@type WebpackConfig*/extConfig)
{
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
			/*
			plugins: [
				//@ts-expect-error
				new TsconfigPathsPlugin({
					extensions: ['.ts', '.tsx', '.js', '.jsx'],
					mainFields: ['module', 'main'],
				})
			]*/
		},
		// plugins: [ new HtmlWebpackPlugin() ],
		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: /node_modules/,
					loader: 'ts-loader',
					options: {
						compilerOptions: {
							module: 'es6'
						},
						projectReferences: true,
					}
				},
			]
		},
		externals:
		{
			'vscode': 'commonjs vscode'
		},
		output: {
			filename: '[name].js',
			// @ts-ignore
			path: path.join(extConfig.context, 'out'),
			libraryTarget: 'commonjs2',
			// chunkFilename: '[name].js'
		},
		devtool: 'source-map'
	};
	// @ts-ignore
	return mergeOptions(defaultConfig, extConfig);
};