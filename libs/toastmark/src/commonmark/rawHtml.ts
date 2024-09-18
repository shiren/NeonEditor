const TAGNAME = '[A-Za-z][A-Za-z0-9-]*';
const ATTRIBUTENAME = '[a-zA-Z_:][a-zA-Z0-9:._-]*';
const UNQUOTEDVALUE = '[^"\'=<>`\\x00-\\x20]+';

const SINGLEQUOTEDVALUE = "'[^']*'";
const DOUBLEQUOTEDVALUE = '"[^"]*"';

const ATTRIBUTEVALUE = `(?:${UNQUOTEDVALUE}|${SINGLEQUOTEDVALUE}|${DOUBLEQUOTEDVALUE})`;
const ATTRIBUTEVALUESPEC = `${'(?:\\s*=\\s*'}${ATTRIBUTEVALUE})`;
const ATTRIBUTE = `${'(?:\\s+'}${ATTRIBUTENAME}${ATTRIBUTEVALUESPEC}?)`;

export const OPENTAG = `<${TAGNAME}${ATTRIBUTE}*\\s*/?>`;
export const CLOSETAG = `</${TAGNAME}\\s*[>]`;

const HTMLCOMMENT = '<!-->|<!--->|<!--(?:[^-]|-[^-]|--[^>])*-->';
const PROCESSINGINSTRUCTION = '[<][?].*?[?][>]';
const DECLARATION = '<![A-Z]+\\s+[^>]*>';
const CDATA = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

const HTMLTAG = `(?:${OPENTAG}|${CLOSETAG}|${HTMLCOMMENT}|${PROCESSINGINSTRUCTION}|${DECLARATION}|${CDATA})`;

export const reHtmlTag = new RegExp(`^${HTMLTAG}`, 'i');
