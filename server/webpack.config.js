
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-check
'use strict';

const withDefaults = require('../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
	context: path.join(__dirname),
	entry: {
		server: './src/server.ts',
	},
	output: {
		filename: '[name].js',
		path: path.join(__dirname, 'out')
	},
	// resolve: {
	// 	roots: [path.resolve('./src')]
	// },
	/*
	module: {
		rules: [
			{
				// test: [/\.tsx?$/, /\.js$/ ],
				// test: /\.tsx?$/,
				exclude: /node_modules/,
				use: [{
					loader: 'ts-loader',
					options: {
						compilerOptions: {
							// 'allowJs': false
							// 'noImplicitAny': true
						},
						// projectReferences: true,
					}
				}]
			},
		]
	},
	// */
	// /*
	optimization: {
		runtimeChunk: 'single',
		splitChunks: {
			cacheGroups: {
				defaultVendors: {
					chunks: 'all',
					enforce: true,
					test: /[\\/]node_modules[\\/](!vscode-languageserver)(!vscode-languageserver-textdocument)(!vscode-uri)[\\/]/,
					filename: 'vendors.js'
					// name: 'vendor',
					// name(module) {
					// 	// get the name. E.g. node_modules/packageName/not/this/part.js
					// 	// or node_modules/packageName
					// 	const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
					// 	// npm package names are URL-safe, but some servers don't like @ symbols
					// 	return `${packageName.replace('@', '')}`;
					// },
				},
			},
		},
	}
	// */
});