// moo tokenizer
const moo = require('moo');
//-----------------------------------------------------------------------------------
// CASE INSENSITIVE FOR KEYWORKDS
const caseInsensitiveKeywords = map => {
	const transform = moo.keywords(map);
	return text => transform(text.toLowerCase());
};
module.exports = {
	caseInsensitiveKeywords
};