/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-check
const withDefaults = require('../shared.webpack.config');
const path = require('path');
// const ThreadsPlugin = require('threads-plugin');

module.exports = withDefaults({
	context: path.resolve(__dirname),
	entry: {
		server: './src/server.ts',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'out')
	},
	/*
	plugins: [
		new ThreadsPlugin()
	]*/
	/* ,
	module: {
		rules:[{
			options: {
				compilerOptions: {
					module: 'esnext'
				},
				projectReferences: true,
			}
		}]
	}
	//*/
});