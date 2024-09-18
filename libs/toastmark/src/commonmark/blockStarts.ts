import { ListData } from '@t/node';
import { ListNode, HtmlBlockNode, HeadingNode, CodeBlockNode, createNode, BlockNode } from './node';
import { OPENTAG, CLOSETAG } from './rawHtml';
import {
  peek,
  isSpaceOrTab,
  reNonSpace,
  CODE_INDENT,
  C_OPEN_BRACKET,
  C_GREATERTHAN,
  C_LESSTHAN,
  C_TAB,
  C_SPACE,
} from './blockHelper';
import { Parser } from './blocks';
import { tableHead, tableBody } from './gfm/tableBlockStart';
import { customBlock } from './custom/customBlockStart';

export const enum Matched {
  None = 0, // No Match
  Container, // Keep Going
  Leaf, // No more block starts
}
export interface BlockStart {
  (parser: Parser, container: BlockNode): Matched;
}

const reCodeFence = /^`{3,}(?!.*`)|^~{3,}/;
const reHtmlBlockOpen = [
  /./, // dummy for 0
  /^<(?:script|pre|style|textarea)(?:\s|>|$)/i,
  /^<!--/,
  /^<[?]/,
  /^<![A-Z]/,
  /^<!\[CDATA\[/,
  /^<[/]?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[123456]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|[/]?[>]|$)/i,
  new RegExp(`^(?:${OPENTAG}|${CLOSETAG})\\s*$`, 'i'),
];
const reSetextHeadingLine = /^(?:=+|-+)[ \t]*$/;
const reATXHeadingMarker = /^#{1,6}(?:[ \t]+|$)/;
const reThematicBreak = /^(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})[ \t]*$/;
export const reBulletListMarker = /^[*+-]/;
export const reOrderedListMarker = /^(\d{1,9})([.)])/;

// Parse a list marker and return data on the marker (type,
// start, delimiter, bullet character, padding) or null.
function parseListMarker(parser: Parser, container: ListNode): ListData | null {
  const rest = parser.currentLine.slice(parser.nextNonspace);
  let match;
  let nextc;
  const data: ListData = {
    type: 'bullet',
    tight: true, // lists are tight by default
    bulletChar: '',
    start: 0,
    delimiter: '',
    padding: 0,
    markerOffset: parser.indent,
    // GFM: Task List Item
    task: false,
    checked: false,
  };

  if (parser.indent >= 4) {
    return null;
  }
  if ((match = rest.match(reBulletListMarker))) {
    data.type = 'bullet';
    data.bulletChar = match[0][0];
  } else if (
    (match = rest.match(reOrderedListMarker)) &&
    (container.type !== 'paragraph' || match[1] === '1')
  ) {
    data.type = 'ordered';
    data.start = parseInt(match[1], 10);
    data.delimiter = match[2];
  } else {
    return null;
  }
  // make sure we have spaces after
  nextc = peek(parser.currentLine, parser.nextNonspace + match[0].length);
  if (!(nextc === -1 || nextc === C_TAB || nextc === C_SPACE)) {
    return null;
  }

  // if it interrupts paragraph, make sure first line isn't blank
  if (
    container.type === 'paragraph' &&
    !parser.currentLine.slice(parser.nextNonspace + match[0].length).match(reNonSpace)
  ) {
    return null;
  }

  // we've got a match! advance offset and calculate padding
  parser.advanceNextNonspace(); // to start of marker
  parser.advanceOffset(match[0].length, true); // to end of marker
  const spacesStartCol = parser.column;
  const spacesStartOffset = parser.offset;
  do {
    parser.advanceOffset(1, true);
    nextc = peek(parser.currentLine, parser.offset);
  } while (parser.column - spacesStartCol < 5 && isSpaceOrTab(nextc));
  const blankItem = peek(parser.currentLine, parser.offset) === -1;
  const spacesAfterMarker = parser.column - spacesStartCol;
  if (spacesAfterMarker >= 5 || spacesAfterMarker < 1 || blankItem) {
    data.padding = match[0].length + 1;
    parser.column = spacesStartCol;
    parser.offset = spacesStartOffset;
    if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
      parser.advanceOffset(1, true);
    }
  } else {
    data.padding = match[0].length + spacesAfterMarker;
  }

  return data;
}

// Returns true if the two list items are of the same type,
// with the same delimiter and bullet character.  This is used
// in agglomerating list items into lists.
function listsMatch(listData: ListData, itemData: ListData) {
  return (
    listData.type === itemData.type &&
    listData.delimiter === itemData.delimiter &&
    listData.bulletChar === itemData.bulletChar
  );
}

function isDisallowedDeepHeading(parser: Parser, node: BlockNode) {
  return parser.options.disallowDeepHeading && (node.type === 'blockQuote' || node.type === 'item');
}

const blockQuote: BlockStart = (parser) => {
  if (!parser.indented && peek(parser.currentLine, parser.nextNonspace) === C_GREATERTHAN) {
    parser.advanceNextNonspace();
    parser.advanceOffset(1, false);
    // optional following space
    if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
      parser.advanceOffset(1, true);
    }
    parser.closeUnmatchedBlocks();
    parser.addChild('blockQuote', parser.nextNonspace);
    return Matched.Container;
  }
  return Matched.None;
};

const atxHeading: BlockStart = (parser, container) => {
  let match;
  if (
    !parser.indented &&
    // The nested Heading is disallowed in list and blockquote with 'disallowDeepHeading' option
    !isDisallowedDeepHeading(parser, container) &&
    (match = parser.currentLine.slice(parser.nextNonspace).match(reATXHeadingMarker))
  ) {
    parser.advanceNextNonspace();
    parser.advanceOffset(match[0].length, false);
    parser.closeUnmatchedBlocks();

    const heading = parser.addChild('heading', parser.nextNonspace) as HeadingNode;
    heading.level = match[0].trim().length; // number of #s
    heading.headingType = 'atx';
    // remove trailing ###s:
    heading.stringContent = parser.currentLine
      .slice(parser.offset)
      .replace(/^[ \t]*#+[ \t]*$/, '')
      .replace(/[ \t]+#+[ \t]*$/, '');
    parser.advanceOffset(parser.currentLine.length - parser.offset);
    return Matched.Leaf;
  }
  return Matched.None;
};

const fencedCodeBlock: BlockStart = (parser) => {
  let match;
  if (
    !parser.indented &&
    (match = parser.currentLine.slice(parser.nextNonspace).match(reCodeFence))
  ) {
    const fenceLength = match[0].length;
    parser.closeUnmatchedBlocks();
    const container = parser.addChild('codeBlock', parser.nextNonspace) as CodeBlockNode;
    container.isFenced = true;
    container.fenceLength = fenceLength;
    container.fenceChar = match[0][0];
    container.fenceOffset = parser.indent;
    parser.advanceNextNonspace();
    parser.advanceOffset(fenceLength, false);
    return Matched.Leaf;
  }
  return Matched.None;
};

const htmlBlock: BlockStart = (parser, container) => {
  if (!parser.indented && peek(parser.currentLine, parser.nextNonspace) === C_LESSTHAN) {
    const s = parser.currentLine.slice(parser.nextNonspace);
    const disallowedTags = parser.options.disallowedHtmlBlockTags;
    let blockType;

    for (blockType = 1; blockType <= 7; blockType++) {
      const matched = s.match(reHtmlBlockOpen[blockType]);
      if (matched) {
        if (blockType === 7) {
          if (container.type === 'paragraph') {
            return Matched.None;
          }
          if (disallowedTags.length > 0) {
            const reDisallowedTags = new RegExp(`<\/?(?:${disallowedTags.join('|')})`, 'i');
            if (reDisallowedTags.test(matched[0])) {
              return Matched.None;
            }
          }
        }

        parser.closeUnmatchedBlocks();
        // We don't adjust parser.offset;
        // spaces are part of the HTML block:
        const b = parser.addChild('htmlBlock', parser.offset) as HtmlBlockNode;
        b.htmlBlockType = blockType;
        return Matched.Leaf;
      }
    }
  }
  return Matched.None;
};

const seTextHeading: BlockStart = (parser, container) => {
  let match;
  if (
    container.stringContent !== null &&
    !parser.indented &&
    container.type === 'paragraph' &&
    // The nested Heading is disallowed in list and blockquote with 'disallowDeepHeading' option
    !isDisallowedDeepHeading(parser, container.parent as BlockNode) &&
    (match = parser.currentLine.slice(parser.nextNonspace).match(reSetextHeadingLine))
  ) {
    parser.closeUnmatchedBlocks();
    // resolve reference link definitions
    let pos;
    while (
      peek(container.stringContent, 0) === C_OPEN_BRACKET &&
      (pos = parser.inlineParser.parseReference(container, parser.refMap))
    ) {
      container.stringContent = container.stringContent.slice(pos);
    }
    if (container.stringContent.length > 0) {
      const heading = createNode('heading', container.sourcepos);
      heading.level = match[0][0] === '=' ? 1 : 2;
      heading.headingType = 'setext';
      heading.stringContent = container.stringContent;
      container.insertAfter(heading);
      container.unlink();
      parser.tip = heading;
      parser.advanceOffset(parser.currentLine.length - parser.offset, false);
      return Matched.Leaf;
    }
    return Matched.None;
  }
  return Matched.None;
};

const thematicBreak: BlockStart = (parser) => {
  if (!parser.indented && reThematicBreak.test(parser.currentLine.slice(parser.nextNonspace))) {
    parser.closeUnmatchedBlocks();
    parser.addChild('thematicBreak', parser.nextNonspace);
    parser.advanceOffset(parser.currentLine.length - parser.offset, false);
    return Matched.Leaf;
  }
  return Matched.None;
};

const listItem: BlockStart = (parser, container) => {
  let data;
  let currNode = container as ListNode;

  if (
    (!parser.indented || container.type === 'list') &&
    (data = parseListMarker(parser, currNode))
  ) {
    parser.closeUnmatchedBlocks();

    // add the list if needed
    if (parser.tip.type !== 'list' || !listsMatch(currNode.listData!, data)) {
      currNode = parser.addChild('list', parser.nextNonspace) as ListNode;
      currNode.listData = data;
    }

    // add the list item
    currNode = parser.addChild('item', parser.nextNonspace) as ListNode;
    currNode.listData = data;

    return Matched.Container;
  }
  return Matched.None;
};

// indented code block
const indentedCodeBlock: BlockStart = (parser) => {
  if (parser.indented && parser.tip.type !== 'paragraph' && !parser.blank) {
    // indented code
    parser.advanceOffset(CODE_INDENT, true);
    parser.closeUnmatchedBlocks();
    parser.addChild('codeBlock', parser.offset);
    return Matched.Leaf;
  }
  return Matched.None;
};

export const blockStarts = [
  blockQuote,
  atxHeading,
  fencedCodeBlock,
  htmlBlock,
  seTextHeading,
  thematicBreak,
  listItem,
  indentedCodeBlock,
  tableHead,
  tableBody,
  customBlock,
];
