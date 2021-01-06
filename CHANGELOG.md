# Change Log

All notable changes to the "language-maxscript" extension will be documented in this file.

## [1.24.0]

- Implemented multi-threading
- Several fixes & performance improvements.
- updated to vscode-languageserver v7.0.0
- moved Semantic tokens to server
- updated and standardized syntax highlight rules

## [1.23.0]

- Added: New code minifier algorithm, code beautifier.
- Several crashes fixed.
- Optimizations

## [1.21.0]

- Fixed crash in "go to Definition" feature
- Added: Code formatter. This is a simple implementation, designed to deal with indentation on balanced character pairs and whitespace. It will only indent blocks if they are enclosed in braces.
- Several optimizations

## [1.20.0]

*This work is still experimental*

This version includes an attempt to create a full parser/lexer (albeit slow) for MaxScript. Is still experimental and not optimized, it could fail often, since the loose type nature MaxScript I've found hard to account for all the possible syntaxes.
I intend to add a code Formatter, Workspace support, and other vscode features in the future.

- Implemented Language Server (LSP)
- Implemented a Parser
- DocumentSymbols and Definitions through parser.
- Basic Diagnostics.
- Minify code command.
- Several changes to improve the user experience.

## [1.10.0]

- Added Semantic Syntax for 3ds Max classes, structs...
- Changed TexMate scopes to a more standard format. Fixed several rules.
- Added "decorated" comments

## [1.9.3] - 2020-05-13

- Pathnames highlight

## [1.9.2] - 2020-05-02

- Fixed float values highlight and other improvements
- Work on a more optimized Completions feature
- General fixes and cleanup.

## [1.9.1] - 2020-04-23

- Syntax highlight rules simplification
- Small Syntax fixes
- Changed indentation rules
- Cleanup

## [1.8.4] - 2019-03

- Optimized syntax

## [1.8.x] - 2018-06

- Added basic "go to symbol" support.
- Added basic support for definitions.
- Optimized autocompletion.
- fixed some grammar issues.
- **Changed grammar tokens to be more consistent**: See readme.
- Added configuration settings to turn off language features.

## [1.7.3] - 2018-03-20

- Added syntax support for localized string resources.
- Minor fixes.

## [1.7.2] - 2017-12-05

- Event syntax highlight fix
- Minor fixes

## [1.4.0] - 2017-08-15

- Code highlight improvements
- Dropped custom Theme, for vscode 1.15.0 and up, please use the new *Custom syntax highlighting* setting (see readme for a example template).

## [1.2.0] - 2017-05-23

- Grammar and autocompletion fixes.

## [1.0.0] - 2017-05-20

### Initial release

- Grammar support.
- Autocompletion suggestions.
- Help command.
- Adapted OneDark theme to support syntax coloring of MaxScript elements.
