
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
	/*
	externals: {
		'ast-get-object': 'commonjs ast-get-object',
		'ast-get-values-by-key': 'commonjs ast-get-values-by-key',
		'ast-monkey-traverse': 'commonjs ast-monkey-traverse',
		'ast-compare': 'commonjs ast-compare',
		'object-path' : 'commonjs object-path',
		'vscode-languageserver' : 'commonjs vscode-languageserver',
		'vscode-languageserver-textdocument': 'commonjs vscode-languageserver-textdocument',
		'vscode-uri': 'commonjs vscode-uri',
		'lodash': 'commonjs lodash',
		'matcher': 'commonjs matcher',
		'moo': 'commonjs moo',
		'nearley': 'commonjs nearley',
	}
	// */
	optimization: {
		/*
		runtimeChunk: 'single',
		splitChunks: {
			minSize: 0,
			maxInitialRequests: Infinity,
			cacheGroups: {
				vendor: {
					chunks: 'all',
					// name: 'vendors',
					test: /[\\/]node_modules[\\/]/,
					name(module) {
						// get the name. E.g. node_modules/packageName/not/this/part.js
						// or node_modules/packageName
						const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
						// npm package names are URL-safe, but some servers don't like @ symbols
						return `${packageName.replace('@', '')}`;
					},
					minChunks:1,
					enforce: true
				}
			}
		},
		//*/
		/*
		splitChunks: {
			chunks: 'all',
			maxInitialRequests: Infinity,
			minSize: 0,
			cacheGroups: {
				vscodeLsVendor: {
					test: /[\\/]node_modules[\\/](vscode-languageserver|vscode-languageserver-textdocument|vscode-uri)[\\/]/,
					name: 'vscodevendor'
				},
				vendor: {
					test: /[\\/]node_modules[\\/](!vscode-languageserver)(!vscode-languageserver-textdocument)(!vscode-uri)[\\/]/,
					name: 'vendor'
				},
			},
		},
		// */
	}
	// */
});