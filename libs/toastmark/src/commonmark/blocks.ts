import {
  BlockParser,
  ParserOptions,
  RefDefCandidateMap,
  RefLinkCandidateMap,
  RefMap,
} from '@t/parser';
import { BlockNodeType } from '@t/node';
import { repeat } from './common';
import { Node, BlockNode, isCodeBlock, isHtmlBlock, createNode, TableCellNode } from './node';
import { InlineParser, C_NEWLINE } from './inlines';
import { blockHandlers, Process } from './blockHandlers';
import { CODE_INDENT } from './blockHelper';
import { blockStarts, Matched } from './blockStarts';
import { clearObj } from '../helper';
import { frontMatter as frontMatterHandler } from './frontMatter/frontMatterHandler';
import { frontMatter as frontMatterStart } from './frontMatter/frontMatterStart';

const reHtmlBlockClose = [
  /./, // dummy for 0
  /<\/(?:script|pre|style|textarea)>/i,
  /-->/,
  /\?>/,
  />/,
  /\]\]>/,
];

const reMaybeSpecial = /^[#`~*+_=<>0-9-;$]/;
const reLineEnding = /\r\n|\n|\r/;

function document() {
  return createNode('document', [
    [1, 1],
    [0, 0],
  ]);
}

const defaultOptions = {
  smart: false,
  tagFilter: false,
  extendedAutolinks: false,
  disallowedHtmlBlockTags: [],
  referenceDefinition: false,
  disallowDeepHeading: false,
  customParser: null,
  frontMatter: false,
};

export class Parser implements BlockParser {
  public doc: BlockNode;
  public tip: BlockNode;
  public oldtip: BlockNode;
  public currentLine: string;
  public lineNumber: number;
  public offset: number;
  public column: number;
  public nextNonspace: number;
  public nextNonspaceColumn: number;
  public indent: number;
  public indented: boolean;
  public blank: boolean;
  private partiallyConsumedTab: boolean;
  private allClosed: boolean;
  private lastMatchedContainer: Node;
  public refMap: RefMap;
  public refLinkCandidateMap: RefLinkCandidateMap;
  public refDefCandidateMap: RefDefCandidateMap;
  public lastLineLength: number;
  public inlineParser: InlineParser;
  public options: ParserOptions;
  public lines: string[];

  constructor(options?: Partial<ParserOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.doc = document();
    this.tip = this.doc;
    this.oldtip = this.doc;
    this.lineNumber = 0;
    this.offset = 0;
    this.column = 0;
    this.nextNonspace = 0;
    this.nextNonspaceColumn = 0;
    this.indent = 0;
    this.currentLine = '';
    this.indented = false;
    this.blank = false;
    this.partiallyConsumedTab = false;
    this.allClosed = true;
    this.lastMatchedContainer = this.doc;
    this.refMap = {};
    this.refLinkCandidateMap = {};
    this.refDefCandidateMap = {};
    this.lastLineLength = 0;
    this.lines = [];

    if (this.options.frontMatter) {
      blockHandlers.frontMatter = frontMatterHandler;
      blockStarts.unshift(frontMatterStart);
    }

    this.inlineParser = new InlineParser(this.options);
  }

  advanceOffset(count: number, columns = false) {
    const currentLine = this.currentLine;
    let charsToTab: number, charsToAdvance: number;
    let c: string;
    while (count > 0 && (c = currentLine[this.offset])) {
      if (c === '\t') {
        charsToTab = 4 - (this.column % 4);
        if (columns) {
          this.partiallyConsumedTab = charsToTab > count;
          charsToAdvance = charsToTab > count ? count : charsToTab;
          this.column += charsToAdvance;
          this.offset += this.partiallyConsumedTab ? 0 : 1;
          count -= charsToAdvance;
        } else {
          this.partiallyConsumedTab = false;
          this.column += charsToTab;
          this.offset += 1;
          count -= 1;
        }
      } else {
        this.partiallyConsumedTab = false;
        this.offset += 1;
        this.column += 1; // assume ascii; block starts are ascii
        count -= 1;
      }
    }
  }

  advanceNextNonspace() {
    this.offset = this.nextNonspace;
    this.column = this.nextNonspaceColumn;
    this.partiallyConsumedTab = false;
  }

  findNextNonspace() {
    const currentLine = this.currentLine;
    let i = this.offset;
    let cols = this.column;
    let c: string;

    while ((c = currentLine.charAt(i)) !== '') {
      if (c === ' ') {
        i++;
        cols++;
      } else if (c === '\t') {
        i++;
        cols += 4 - (cols % 4);
      } else {
        break;
      }
    }
    this.blank = c === '\n' || c === '\r' || c === '';
    this.nextNonspace = i;
    this.nextNonspaceColumn = cols;
    this.indent = this.nextNonspaceColumn - this.column;
    this.indented = this.indent >= CODE_INDENT;
  }

  // Add a line to the block at the tip.  We assume the tip
  // can accept lines -- that check should be done before calling this.
  addLine() {
    if (this.partiallyConsumedTab) {
      this.offset += 1; // skip over tab
      // add space characters:
      const charsToTab = 4 - (this.column % 4);
      this.tip.stringContent += repeat(' ', charsToTab);
    }
    if (this.tip.lineOffsets) {
      this.tip.lineOffsets.push(this.offset);
    } else {
      this.tip.lineOffsets = [this.offset];
    }
    this.tip.stringContent += `${this.currentLine.slice(this.offset)}\n`;
  }

  // Add block of type tag as a child of the tip.  If the tip can't
  // accept children, close and finalize it and try its parent,
  // and so on til we find a block that can accept children.
  addChild(tag: BlockNodeType, offset: number) {
    while (!blockHandlers[this.tip.type].canContain(tag)) {
      this.finalize(this.tip, this.lineNumber - 1);
    }

    const columnNumber = offset + 1; // offset 0 = column 1
    const newBlock = createNode(tag, [
      [this.lineNumber, columnNumber],
      [0, 0],
    ]);
    newBlock.stringContent = '';
    this.tip.appendChild(newBlock);
    this.tip = newBlock;
    return newBlock;
  }

  // Finalize and close any unmatched blocks.
  closeUnmatchedBlocks() {
    if (!this.allClosed) {
      // finalize any blocks not matched
      while (this.oldtip !== this.lastMatchedContainer) {
        const parent = this.oldtip.parent as BlockNode;
        this.finalize(this.oldtip, this.lineNumber - 1);
        this.oldtip = parent!;
      }
      this.allClosed = true;
    }
  }

  // Finalize a block.  Close it and do any necessary postprocessing,
  // e.g. creating stringContent from strings, setting the 'tight'
  // or 'loose' status of a list, and parsing the beginnings
  // of paragraphs for reference definitions.  Reset the tip to the
  // parent of the closed block.
  finalize(block: BlockNode, lineNumber: number) {
    const above = block.parent as BlockNode;
    block.open = false;
    block.sourcepos![1] = [lineNumber, this.lastLineLength];
    blockHandlers[block.type].finalize(this, block);

    this.tip = above;
  }

  // Walk through a block & children recursively, parsing string content
  // into inline content where appropriate.
  processInlines(block: BlockNode) {
    let event;
    const { customParser } = this.options;
    const walker = block.walker();
    this.inlineParser.refMap = this.refMap;
    this.inlineParser.refLinkCandidateMap = this.refLinkCandidateMap;
    this.inlineParser.refDefCandidateMap = this.refDefCandidateMap;
    this.inlineParser.options = this.options;

    while ((event = walker.next())) {
      const { node, entering } = event;
      const t = node.type;

      if (customParser && customParser[t]) {
        customParser[t]!(node, { entering, options: this.options });
      }

      if (
        !entering &&
        (t === 'paragraph' ||
          t === 'heading' ||
          (t === 'tableCell' && !(node as TableCellNode).ignored))
      ) {
        this.inlineParser.parse(node as BlockNode);
      }
    }
  }

  // Analyze a line of text and update the document appropriately.
  // We parse markdown text by calling this on each line of input,
  // then finalizing the document.
  incorporateLine(ln: string) {
    let container = this.doc;
    this.oldtip = this.tip;
    this.offset = 0;
    this.column = 0;
    this.blank = false;
    this.partiallyConsumedTab = false;
    this.lineNumber += 1;

    // replace NUL characters for security
    if (ln.indexOf('\u0000') !== -1) {
      ln = ln.replace(/\0/g, '\uFFFD');
    }

    this.currentLine = ln;

    // For each containing block, try to parse the associated line start.
    // Bail out on failure: container will point to the last matching block.
    // Set allMatched to false if not all containers match.
    let allMatched = true;
    let lastChild: BlockNode;
    while ((lastChild = container.lastChild as BlockNode) && lastChild.open) {
      container = lastChild;

      this.findNextNonspace();

      switch (blockHandlers[container.type]['continue'](this, container)) {
        case Process.Go: // we've matched, keep going
          break;
        case Process.Stop: // we've failed to match a block
          allMatched = false;
          break;
        case Process.Finished: // we've hit end of line for fenced code close and can return
          this.lastLineLength = ln.length;
          return;
        default:
          throw new Error('continue returned illegal value, must be 0, 1, or 2');
      }
      if (!allMatched) {
        container = container.parent as BlockNode; // back up to last matching block
        break;
      }
    }

    this.allClosed = container === this.oldtip;
    this.lastMatchedContainer = container;

    let matchedLeaf = container.type !== 'paragraph' && blockHandlers[container.type].acceptsLines;
    const blockStartsLen = blockStarts.length;
    // Unless last matched container is a code block, try new container starts,
    // adding children to the last matched container:
    while (!matchedLeaf) {
      this.findNextNonspace();

      // this is a little performance optimization:
      if (
        container.type !== 'table' &&
        container.type !== 'tableBody' &&
        container.type !== 'paragraph' &&
        !this.indented &&
        !reMaybeSpecial.test(ln.slice(this.nextNonspace))
      ) {
        this.advanceNextNonspace();
        break;
      }

      let i = 0;
      while (i < blockStartsLen) {
        const res = blockStarts[i](this, container);
        if (res === Matched.Container) {
          container = this.tip;
          break;
        } else if (res === Matched.Leaf) {
          container = this.tip;
          matchedLeaf = true;
          break;
        } else {
          i++;
        }
      }

      if (i === blockStartsLen) {
        // nothing matched
        this.advanceNextNonspace();
        break;
      }
    }

    // What remains at the offset is a text line.  Add the text to the
    // appropriate container.

    // First check for a lazy paragraph continuation:
    if (!this.allClosed && !this.blank && this.tip.type === 'paragraph') {
      // lazy paragraph continuation
      this.addLine();
    } else {
      // not a lazy continuation

      // finalize any blocks not matched
      this.closeUnmatchedBlocks();
      if (this.blank && container.lastChild) {
        (container.lastChild as BlockNode).lastLineBlank = true;
      }

      const t = container.type;
      // Block quote lines are never blank as they start with >
      // and we don't count blanks in fenced code for purposes of tight/loose
      // lists or breaking out of lists. We also don't set _lastLineBlank
      // on an empty list item, or if we just closed a fenced block.
      const lastLineBlank =
        this.blank &&
        !(
          t === 'blockQuote' ||
          (isCodeBlock(container) && container.isFenced) ||
          (t === 'item' && !container.firstChild && container.sourcepos![0][0] === this.lineNumber)
        );

      // propagate lastLineBlank up through parents:
      let cont: BlockNode | null = container;
      while (cont) {
        cont.lastLineBlank = lastLineBlank;
        cont = cont.parent as BlockNode;
      }

      if (blockHandlers[t].acceptsLines) {
        this.addLine();
        // if HtmlBlock, check for end condition
        if (
          isHtmlBlock(container) &&
          container.htmlBlockType >= 1 &&
          container.htmlBlockType <= 5 &&
          reHtmlBlockClose[container.htmlBlockType].test(this.currentLine.slice(this.offset))
        ) {
          this.lastLineLength = ln.length;
          this.finalize(container, this.lineNumber);
        }
      } else if (this.offset < ln.length && !this.blank) {
        // create paragraph container for line
        container = this.addChild('paragraph', this.offset);
        this.advanceNextNonspace();
        this.addLine();
      }
    }
    this.lastLineLength = ln.length;
  }

  // The main parsing function.  Returns a parsed document AST.
  parse(input: string, lineTexts?: string[]) {
    this.doc = document();
    this.tip = this.doc;
    this.lineNumber = 0;
    this.lastLineLength = 0;
    this.offset = 0;
    this.column = 0;
    this.lastMatchedContainer = this.doc;
    this.currentLine = '';
    const lines = input.split(reLineEnding);
    let len = lines.length;
    this.lines = lineTexts ? lineTexts : lines;
    if (this.options.referenceDefinition) {
      this.clearRefMaps();
    }
    if (input.charCodeAt(input.length - 1) === C_NEWLINE) {
      // ignore last blank line created by final newline
      len -= 1;
    }
    for (let i = 0; i < len; i++) {
      this.incorporateLine(lines[i]);
    }
    while (this.tip) {
      this.finalize(this.tip, len);
    }
    this.processInlines(this.doc);

    return this.doc;
  }

  partialParseStart(lineNumber: number, lines: string[]) {
    this.doc = document();
    this.tip = this.doc;
    this.lineNumber = lineNumber - 1;
    this.lastLineLength = 0;
    this.offset = 0;
    this.column = 0;
    this.lastMatchedContainer = this.doc;
    this.currentLine = '';
    const len = lines.length;

    for (let i = 0; i < len; i++) {
      this.incorporateLine(lines[i]);
    }

    return this.doc;
  }

  partialParseExtends(lines: string[]) {
    for (let i = 0; i < lines.length; i++) {
      this.incorporateLine(lines[i]);
    }
  }

  partialParseFinish() {
    while (this.tip) {
      this.finalize(this.tip, this.lineNumber);
    }
    this.processInlines(this.doc);
  }

  setRefMaps(
    refMap: RefMap,
    refLinkCandidateMap: RefLinkCandidateMap,
    refDefCandidateMap: RefDefCandidateMap
  ) {
    this.refMap = refMap;
    this.refLinkCandidateMap = refLinkCandidateMap;
    this.refDefCandidateMap = refDefCandidateMap;
  }

  clearRefMaps() {
    [this.refMap, this.refLinkCandidateMap, this.refDefCandidateMap].forEach((map) => {
      clearObj(map);
    });
  }
}
