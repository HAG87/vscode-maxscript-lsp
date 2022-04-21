import * as nearley from 'nearley';
declare module 'nearley' {
	interface Parser {
		table: any[];
		buildFirstStateStack(state:any, visited:any): any;
	}
	interface parserError extends Error {
		offset: number
		token: moo.Token
	}
}