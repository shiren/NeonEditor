import { InlineNodeType, Sourcepos, CustomBlockMdNode } from '@t/node';
import { RefMap, RefLinkCandidateMap, RefDefCandidateMap, ParserOptions } from '@t/parser';
import { Node, BlockNode, isHeading, LinkNode, createNode, text, CustomInlineNode } from './node';
import { repeat, normalizeURI, unescapeString, ESCAPABLE, ENTITY } from './common';
import { reHtmlTag } from './rawHtml';
import fromCodePoint from './from-code-point';
import { decodeHTML } from 'entities';
import NodeWalker from './nodeWalker';
import { convertExtAutoLinks } from './gfm/autoLinks';
import { last, normalizeReference } from '../helper';
import { createRefDefState } from '../toastmark';

export const C_NEWLINE = 10;
const C_ASTERISK = 42;
const C_UNDERSCORE = 95;
const C_BACKTICK = 96;
const C_OPEN_BRACKET = 91;
const C_CLOSE_BRACKET = 93;
const C_TILDE = 126;
const C_LESSTHAN = 60;
const C_BANG = 33;
const C_BACKSLASH = 92;
const C_AMPERSAND = 38;
const C_OPEN_PAREN = 40;
const C_CLOSE_PAREN = 41;
const C_COLON = 58;
const C_SINGLEQUOTE = 39;
const C_DOUBLEQUOTE = 34;
const C_DOLLAR = 36;

// Some regexps used in inline parser:
const ESCAPED_CHAR = `\\\\${ESCAPABLE}`;

const rePunctuation = new RegExp(
  /[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~\xA1\xA3\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u20AC\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E42\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDF3C-\uDF3E]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]/
);

const reLinkTitle = new RegExp(
  `^(?:"(${ESCAPED_CHAR}|[^"\\x00])*"` +
    `|` +
    `'(${ESCAPED_CHAR}|[^'\\x00])*'` +
    `|` +
    `\\((${ESCAPED_CHAR}|[^()\\x00])*\\))`
);

const reLinkDestinationBraces = /^(?:<(?:[^<>\n\\\x00]|\\.)*>)/;
const reEscapable = new RegExp(`^${ESCAPABLE}`);
const reEntityHere = new RegExp(`^${ENTITY}`, 'i');
const reTicks = /`+/;
const reTicksHere = /^`+/;
const reEllipses = /\.\.\./g;
const reDash = /--+/g;
const reEmailAutolink = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;
const reAutolink = /^<[A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\x00-\x20]*>/i;
const reSpnl = /^ *(?:\n *)?/;
const reWhitespaceChar = /^[ \t\n\x0b\x0c\x0d]/;
const reUnicodeWhitespaceChar = /^\s/;
const reFinalSpace = / *$/;
const reInitialSpace = /^ */;
const reSpaceAtEndOfLine = /^ *(?:\n|$)/;
const reLinkLabel = /^\[(?:[^\\\[\]]|\\.){0,1000}\]/;

// Matches a string of non-special characters.
const reMain = /^[^\n`\[\]\\!<&*_'"~$]+/m;

type DelimiterCC =
  | typeof C_ASTERISK
  | typeof C_UNDERSCORE
  | typeof C_SINGLEQUOTE
  | typeof C_DOUBLEQUOTE
  | typeof C_TILDE
  | typeof C_DOLLAR;

type Delimiter = {
  cc: DelimiterCC;
  numdelims: number;
  origdelims: number;
  node: Node;
  previous: Delimiter | null;
  next: Delimiter | null;
  canOpen: boolean;
  canClose: boolean;
};

type Bracket = {
  node: Node;
  previous: Bracket | null;
  previousDelimiter: Delimiter | null;
  index: number;
  image: boolean;
  active: boolean;
  bracketAfter?: boolean;
  startpos: [number, number];
};

export class InlineParser {
  // An InlineParser keeps track of a subject (a string to be parsed)
  // and a position in that subject.
  private subject = '';
  private delimiters: Delimiter | null = null; // used by handleDelim method
  private brackets: Bracket | null = null;
  private pos = 0;
  private lineStartNum = 0;
  private lineIdx = 0;
  private lineOffsets: number[] = [0];
  private linePosOffset = 0;
  public refMap: RefMap = {};
  public refLinkCandidateMap: RefLinkCandidateMap = {};
  public refDefCandidateMap: RefDefCandidateMap = {};
  public options: ParserOptions;

  constructor(options: ParserOptions) {
    this.options = options;
  }

  sourcepos(start: number): [number, number];
  sourcepos(start: number, end: number): Sourcepos;
  sourcepos(start: number, end?: number): [number, number] | Sourcepos {
    const linePosOffset = this.linePosOffset + this.lineOffsets[this.lineIdx];
    const lineNum = this.lineStartNum + this.lineIdx;
    const startpos = [lineNum, start + linePosOffset];

    if (typeof end === 'number') {
      return [startpos, [lineNum, end + linePosOffset]] as Sourcepos;
    }
    return startpos as [number, number];
  }

  nextLine() {
    this.lineIdx += 1;
    this.linePosOffset = -this.pos;
  }

  // If re matches at current position in the subject, advance
  // position in subject and return the match; otherwise return null.
  match(re: RegExp) {
    const m = re.exec(this.subject.slice(this.pos));
    if (m === null) {
      return null;
    }
    this.pos += m.index + m[0].length;
    return m[0];
  }

  // Returns the code for the character at the current subject position, or -1
  // there are no more characters.
  peek() {
    if (this.pos < this.subject.length) {
      return this.subject.charCodeAt(this.pos);
    }
    return -1;
  }

  // Parse zero or more space characters, including at most one newline
  spnl() {
    this.match(reSpnl);
    return true;
  }

  // All of the parsers below try to match something at the current position
  // in the subject.  If they succeed in matching anything, they
  // return the inline matched, advancing the subject.

  // Attempt to parse backticks, adding either a backtick code span or a
  // literal sequence of backticks.
  parseBackticks(block: BlockNode) {
    const startpos = this.pos + 1;
    const ticks = this.match(reTicksHere);
    if (ticks === null) {
      return false;
    }
    const afterOpenTicks = this.pos;
    let matched: string | null;
    while ((matched = this.match(reTicks)) !== null) {
      if (matched === ticks) {
        let contents = this.subject.slice(afterOpenTicks, this.pos - ticks.length);
        const sourcepos = this.sourcepos(startpos, this.pos);
        const lines = contents.split('\n');
        if (lines.length > 1) {
          const lastLine = last(lines);
          this.lineIdx += lines.length - 1;
          this.linePosOffset = -(this.pos - lastLine.length - ticks.length);
          sourcepos[1] = this.sourcepos(this.pos);
          contents = lines.join(' ');
        }
        const node = createNode('code', sourcepos);

        if (
          contents.length > 0 &&
          contents.match(/[^ ]/) !== null &&
          contents[0] == ' ' &&
          contents[contents.length - 1] == ' '
        ) {
          node.literal = contents.slice(1, contents.length - 1);
        } else {
          node.literal = contents;
        }
        node.tickCount = ticks.length;
        block.appendChild(node);
        return true;
      }
    }
    // If we got here, we didn't match a closing backtick sequence.
    this.pos = afterOpenTicks;
    block.appendChild(text(ticks, this.sourcepos(startpos, this.pos - 1)));
    return true;
  }

  // Parse a backslash-escaped special character, adding either the escaped
  // character, a hard line break (if the backslash is followed by a newline),
  // or a literal backslash to the block's children.  Assumes current character
  // is a backslash.
  parseBackslash(block: BlockNode) {
    const subj = this.subject;
    let node: Node;
    this.pos += 1;
    const startpos = this.pos;

    if (this.peek() === C_NEWLINE) {
      this.pos += 1;
      node = createNode('linebreak', this.sourcepos(this.pos - 1, this.pos));
      block.appendChild(node);
      this.nextLine();
    } else if (reEscapable.test(subj.charAt(this.pos))) {
      block.appendChild(text(subj.charAt(this.pos), this.sourcepos(startpos, this.pos)));
      this.pos += 1;
    } else {
      block.appendChild(text('\\', this.sourcepos(startpos, startpos)));
    }
    return true;
  }

  // Attempt to parse an autolink (URL or email in pointy brackets).
  parseAutolink(block: BlockNode) {
    let m: string | null;
    let dest: string;
    let node: LinkNode;
    const startpos = this.pos + 1;
    if ((m = this.match(reEmailAutolink))) {
      dest = m.slice(1, m.length - 1);
      node = createNode('link', this.sourcepos(startpos, this.pos));
      node.destination = normalizeURI(`mailto:${dest}`);
      node.title = '';
      node.appendChild(text(dest, this.sourcepos(startpos + 1, this.pos - 1)));
      block.appendChild(node);
      return true;
    }
    if ((m = this.match(reAutolink))) {
      dest = m.slice(1, m.length - 1);
      node = createNode('link', this.sourcepos(startpos, this.pos));
      node.destination = normalizeURI(dest);
      node.title = '';
      node.appendChild(text(dest, this.sourcepos(startpos + 1, this.pos - 1)));
      block.appendChild(node);
      return true;
    }
    return false;
  }

  // Attempt to parse a raw HTML tag.
  parseHtmlTag(block: BlockNode) {
    const startpos = this.pos + 1;
    const m = this.match(reHtmlTag);

    if (m === null) {
      return false;
    }
    const node = createNode('htmlInline', this.sourcepos(startpos, this.pos));
    node.literal = m;
    block.appendChild(node);
    return true;
  }

  // Scan a sequence of characters with code cc, and return information about
  // the number of delimiters and whether they are positioned such that
  // they can open and/or close emphasis or strong emphasis.  A utility
  // function for strong/emph parsing.
  scanDelims(cc: number) {
    let numdelims = 0;
    const startpos = this.pos;

    if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
      numdelims++;
      this.pos++;
    } else {
      while (this.peek() === cc) {
        numdelims++;
        this.pos++;
      }
    }

    if (numdelims === 0 || (numdelims < 2 && (cc === C_TILDE || cc === C_DOLLAR))) {
      this.pos = startpos;
      return null;
    }
    const charBefore = startpos === 0 ? '\n' : this.subject.charAt(startpos - 1);
    const ccAfter = this.peek();
    let charAfter: string;
    if (ccAfter === -1) {
      charAfter = '\n';
    } else {
      charAfter = fromCodePoint(ccAfter);
    }

    const afterIsWhitespace = reUnicodeWhitespaceChar.test(charAfter);
    const afterIsPunctuation = rePunctuation.test(charAfter);
    const beforeIsWhitespace = reUnicodeWhitespaceChar.test(charBefore);
    const beforeIsPunctuation = rePunctuation.test(charBefore);
    const leftFlanking =
      !afterIsWhitespace && (!afterIsPunctuation || beforeIsWhitespace || beforeIsPunctuation);
    const rightFlanking =
      !beforeIsWhitespace && (!beforeIsPunctuation || afterIsWhitespace || afterIsPunctuation);
    let canOpen: boolean;
    let canClose: boolean;

    if (cc === C_UNDERSCORE) {
      canOpen = leftFlanking && (!rightFlanking || beforeIsPunctuation);
      canClose = rightFlanking && (!leftFlanking || afterIsPunctuation);
    } else if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
      canOpen = leftFlanking && !rightFlanking;
      canClose = rightFlanking;
    } else if (cc === C_DOLLAR) {
      canOpen = !afterIsWhitespace;
      canClose = !beforeIsWhitespace;
    } else {
      canOpen = leftFlanking;
      canClose = rightFlanking;
    }
    this.pos = startpos;
    return { numdelims, canOpen, canClose };
  }

  // Handle a delimiter marker for emphasis or a quote.
  handleDelim(cc: DelimiterCC, block: BlockNode) {
    const res = this.scanDelims(cc);
    if (!res) {
      return false;
    }
    const numdelims = res.numdelims;
    const startpos = this.pos + 1;
    let contents: string;

    this.pos += numdelims;
    if (cc === C_SINGLEQUOTE) {
      contents = '\u2019';
    } else if (cc === C_DOUBLEQUOTE) {
      contents = '\u201C';
    } else {
      contents = this.subject.slice(startpos - 1, this.pos);
    }

    const node = text(contents, this.sourcepos(startpos, this.pos));
    block.appendChild(node);

    // Add entry to stack for this opener
    if (
      (res.canOpen || res.canClose) &&
      (this.options.smart || (cc !== C_SINGLEQUOTE && cc !== C_DOUBLEQUOTE))
    ) {
      this.delimiters = {
        cc,
        numdelims,
        origdelims: numdelims,
        node,
        previous: this.delimiters,
        next: null,
        canOpen: res.canOpen,
        canClose: res.canClose,
      };
      if (this.delimiters.previous) {
        this.delimiters.previous.next = this.delimiters;
      }
    }
    return true;
  }

  removeDelimiter(delim: Delimiter) {
    if (delim.previous !== null) {
      delim.previous.next = delim.next;
    }
    if (delim.next === null) {
      // top of stack
      this.delimiters = delim.previous;
    } else {
      delim.next.previous = delim.previous;
    }
  }

  removeDelimitersBetween(bottom: Delimiter, top: Delimiter) {
    if (bottom.next !== top) {
      bottom.next = top;
      top.previous = bottom;
    }
  }

  /**
   * Process all delimiters - emphasis, strong emphasis, strikethrough(gfm)
   * If the smart punctuation options is true,
   * convert single/double quotes to corresponding unicode characters.
   **/
  processEmphasis(stackBottom: Delimiter | null) {
    let opener: Delimiter | null;
    let closer: Delimiter | null;
    let oldCloser: Delimiter | null;
    let openerInl: Node, closerInl: Node;
    let openerFound: boolean;
    let oddMatch = false;
    const openersBottom = {
      [C_UNDERSCORE]: [stackBottom, stackBottom, stackBottom],
      [C_ASTERISK]: [stackBottom, stackBottom, stackBottom],
      [C_SINGLEQUOTE]: [stackBottom],
      [C_DOUBLEQUOTE]: [stackBottom],
      [C_TILDE]: [stackBottom],
      [C_DOLLAR]: [stackBottom],
    };

    // find first closer above stackBottom:
    closer = this.delimiters;
    while (closer !== null && closer.previous !== stackBottom) {
      closer = closer.previous;
    }
    // move forward, looking for closers, and handling each
    while (closer !== null) {
      const closercc = closer.cc;
      const closerEmph = closercc === C_UNDERSCORE || closercc === C_ASTERISK;
      if (!closer.canClose) {
        closer = closer.next;
      } else {
        // found emphasis closer. now look back for first matching opener:
        opener = closer.previous;
        openerFound = false;

        while (
          opener !== null &&
          opener !== stackBottom &&
          opener !== openersBottom[closercc][closerEmph ? closer.origdelims % 3 : 0]
        ) {
          oddMatch =
            closerEmph &&
            (closer.canOpen || opener.canClose) &&
            closer.origdelims % 3 !== 0 &&
            (opener.origdelims + closer.origdelims) % 3 === 0;

          if (opener.cc === closer.cc && opener.canOpen && !oddMatch) {
            openerFound = true;
            break;
          }
          opener = opener.previous;
        }
        oldCloser = closer;

        if (closerEmph || closercc === C_TILDE || closercc === C_DOLLAR) {
          if (!openerFound) {
            closer = closer.next;
          } else if (opener) {
            // (null opener check for type narrowing)
            // calculate actual number of delimiters used from closer
            const useDelims = closer.numdelims >= 2 && opener.numdelims >= 2 ? 2 : 1;
            const emptyDelims = closerEmph ? 0 : 1;

            openerInl = opener.node;
            closerInl = closer.node;

            // build contents for new emph element
            let nodeType: InlineNodeType = closerEmph
              ? useDelims === 1
                ? 'emph'
                : 'strong'
              : 'strike';
            if (closercc === C_DOLLAR) {
              nodeType = 'customInline';
            }
            const newNode = createNode(nodeType);
            const openerEndPos = openerInl.sourcepos![1];
            const closerStartPos = closerInl.sourcepos![0];
            newNode.sourcepos = [
              [openerEndPos[0], openerEndPos[1] - useDelims + 1],
              [closerStartPos[0], closerStartPos[1] + useDelims - 1],
            ];
            openerInl.sourcepos![1][1] -= useDelims;
            closerInl.sourcepos![0][1] += useDelims;

            openerInl.literal = openerInl.literal!.slice(useDelims);
            closerInl.literal = closerInl.literal!.slice(useDelims);
            opener.numdelims -= useDelims;
            closer.numdelims -= useDelims;

            // remove used delimiters from stack elts and inlines
            let tmp = openerInl.next;
            let next;
            while (tmp && tmp !== closerInl) {
              next = tmp.next;
              tmp.unlink();
              newNode.appendChild(tmp);
              tmp = next;
            }

            // build custom inline node
            if (closercc === C_DOLLAR) {
              const textNode = newNode.firstChild!;
              const literal = textNode.literal || '';
              const [info] = literal.split(/\s/)!;

              (newNode as CustomInlineNode).info = info;
              if (literal.length <= info.length) {
                textNode.unlink();
              } else {
                textNode.sourcepos![0][1] += info.length;
                textNode.literal = literal.replace(`${info} `, '');
              }
            }

            openerInl.insertAfter(newNode);

            // remove elts between opener and closer in delimiters stack
            this.removeDelimitersBetween(opener, closer);

            // if opener has 0 delims, remove it and the inline
            // if opener has 1 delims and character is tilde, remove delimiter only
            if (opener.numdelims <= emptyDelims) {
              if (opener.numdelims === 0) {
                openerInl.unlink();
              }
              this.removeDelimiter(opener);
            }

            // if closer has 0 delims, remove it and the inline
            // if closer has 1 delims and character is tilde, remove delimiter only
            if (closer.numdelims <= emptyDelims) {
              if (closer.numdelims === 0) {
                closerInl.unlink();
              }
              const tempstack = closer.next;
              this.removeDelimiter(closer);
              closer = tempstack;
            }
          }
        } else if (closercc === C_SINGLEQUOTE) {
          closer.node.literal = '\u2019';
          if (openerFound) {
            opener!.node.literal = '\u2018';
          }
          closer = closer.next;
        } else if (closercc === C_DOUBLEQUOTE) {
          closer.node.literal = '\u201D';
          if (openerFound) {
            opener!.node.literal = '\u201C';
          }
          closer = closer.next;
        }

        if (!openerFound) {
          // Set lower bound for future searches for openers:
          openersBottom[closercc][closerEmph ? oldCloser.origdelims % 3 : 0] = oldCloser.previous;
          if (!oldCloser.canOpen) {
            // We can remove a closer that can't be an opener,
            // once we've seen there's no matching opener:
            this.removeDelimiter(oldCloser);
          }
        }
      }
    }

    // remove all delimiters
    while (this.delimiters !== null && this.delimiters !== stackBottom) {
      this.removeDelimiter(this.delimiters);
    }
  }

  // Attempt to parse link title (sans quotes), returning the string
  // or null if no match.
  parseLinkTitle() {
    const title = this.match(reLinkTitle);
    if (title === null) {
      return null;
    }
    // chop off quotes from title and unescape:
    return unescapeString(title.substr(1, title.length - 2));
  }

  // Attempt to parse link destination, returning the string or null if no match.
  parseLinkDestination() {
    let res = this.match(reLinkDestinationBraces);
    if (res === null) {
      if (this.peek() === C_LESSTHAN) {
        return null;
      }
      // @TODO handrolled parser; res should be null or the string
      const savepos = this.pos;
      let openparens = 0;
      let c: number;
      while ((c = this.peek()) !== -1) {
        if (c === C_BACKSLASH && reEscapable.test(this.subject.charAt(this.pos + 1))) {
          this.pos += 1;
          if (this.peek() !== -1) {
            this.pos += 1;
          }
        } else if (c === C_OPEN_PAREN) {
          this.pos += 1;
          openparens += 1;
        } else if (c === C_CLOSE_PAREN) {
          if (openparens < 1) {
            break;
          } else {
            this.pos += 1;
            openparens -= 1;
          }
        } else if (reWhitespaceChar.exec(fromCodePoint(c)) !== null) {
          break;
        } else {
          this.pos += 1;
        }
      }
      if (this.pos === savepos && c !== C_CLOSE_PAREN) {
        return null;
      }
      if (openparens !== 0) {
        return null;
      }
      res = this.subject.substr(savepos, this.pos - savepos);
      return normalizeURI(unescapeString(res));
    } // chop off surrounding <..>:
    return normalizeURI(unescapeString(res.substr(1, res.length - 2)));
  }

  // Attempt to parse a link label, returning number of characters parsed.
  parseLinkLabel() {
    const m = this.match(reLinkLabel);
    if (m === null || m.length > 1001) {
      return 0;
    }
    return m.length;
  }

  // Add open bracket to delimiter stack and add a text node to block's children.
  parseOpenBracket(block: BlockNode) {
    const startpos = this.pos;
    this.pos += 1;

    const node = text('[', this.sourcepos(this.pos, this.pos));
    block.appendChild(node);

    // Add entry to stack for this opener
    this.addBracket(node, startpos, false);
    return true;
  }

  // IF next character is [, and ! delimiter to delimiter stack and
  // add a text node to block's children.  Otherwise just add a text node.
  parseBang(block: BlockNode) {
    const startpos = this.pos;
    this.pos += 1;
    if (this.peek() === C_OPEN_BRACKET) {
      this.pos += 1;

      const node = text('![', this.sourcepos(this.pos - 1, this.pos));
      block.appendChild(node);

      // Add entry to stack for this opener
      this.addBracket(node, startpos + 1, true);
    } else {
      const node = text('!', this.sourcepos(this.pos, this.pos));
      block.appendChild(node);
    }
    return true;
  }

  // Try to match close bracket against an opening in the delimiter
  // stack.  Add either a link or image, or a plain [ character,
  // to block's children.  If there is a matching delimiter,
  // remove it from the delimiter stack.
  parseCloseBracket(block: BlockNode) {
    let dest: string | null = null;
    let title: string | null = null;
    let matched = false;

    this.pos += 1;
    const startpos = this.pos;
    // get last [ or ![
    let opener = this.brackets;

    if (opener === null) {
      // no matched opener, just return a literal
      block.appendChild(text(']', this.sourcepos(startpos, startpos)));
      return true;
    }

    if (!opener.active) {
      // no matched opener, just return a literal
      block.appendChild(text(']', this.sourcepos(startpos, startpos)));
      // take opener off brackets stack
      this.removeBracket();
      return true;
    }

    // If we got here, open is a potential opener
    const isImage = opener.image;

    // Check to see if we have a link/image
    const savepos = this.pos;

    // Inline link?
    if (this.peek() === C_OPEN_PAREN) {
      this.pos++;
      if (
        this.spnl() &&
        (dest = this.parseLinkDestination()) !== null &&
        this.spnl() &&
        // make sure there's a space before the title:
        ((reWhitespaceChar.test(this.subject.charAt(this.pos - 1)) &&
          (title = this.parseLinkTitle())) ||
          true) &&
        this.spnl() &&
        this.peek() === C_CLOSE_PAREN
      ) {
        this.pos += 1;
        matched = true;
      } else {
        this.pos = savepos;
      }
    }

    let refLabel = '';

    if (!matched) {
      // Next, see if there's a link label
      const beforelabel = this.pos;
      const n = this.parseLinkLabel();
      if (n > 2) {
        refLabel = this.subject.slice(beforelabel, beforelabel + n);
      } else if (!opener.bracketAfter) {
        // Empty or missing second label means to use the first label as the reference.
        // The reference must not contain a bracket. If we know there's a bracket, we don't even bother checking it.
        refLabel = this.subject.slice(opener.index, startpos);
      }
      if (n === 0) {
        // If shortcut reference link, rewind before spaces we skipped.
        this.pos = savepos;
      }

      if (refLabel) {
        refLabel = normalizeReference(refLabel);
        // lookup rawlabel in refMap
        const link = this.refMap[refLabel];
        if (link) {
          dest = link.destination;
          title = link.title;
          matched = true;
        }
      }
    }

    if (matched) {
      const node = createNode(isImage ? 'image' : 'link');
      node.destination = dest;
      node.title = title || '';
      node.sourcepos = [opener.startpos, this.sourcepos(this.pos)];

      let tmp = opener.node.next;
      let next: Node | null;
      while (tmp) {
        next = tmp.next;
        tmp.unlink();
        node.appendChild(tmp);
        tmp = next;
      }
      block.appendChild(node);
      this.processEmphasis(opener.previousDelimiter);
      this.removeBracket();
      opener.node.unlink();

      // We remove this bracket and processEmphasis will remove later delimiters.
      // Now, for a link, we also deactivate earlier link openers.
      // (no links in links)
      if (!isImage) {
        opener = this.brackets;
        while (opener !== null) {
          if (!opener.image) {
            opener.active = false; // deactivate this opener
          }
          opener = opener.previous;
        }
      }

      if (this.options.referenceDefinition) {
        this.refLinkCandidateMap[block.id] = { node: block, refLabel };
      }
      return true;
    } // no match

    this.removeBracket(); // remove this opener from stack
    this.pos = startpos;
    block.appendChild(text(']', this.sourcepos(startpos, startpos)));

    if (this.options.referenceDefinition) {
      this.refLinkCandidateMap[block.id] = { node: block, refLabel };
    }
    return true;
  }

  addBracket(node: Node, index: number, image: boolean) {
    if (this.brackets !== null) {
      this.brackets.bracketAfter = true;
    }
    this.brackets = {
      node,
      startpos: this.sourcepos(index + (image ? 0 : 1)),
      previous: this.brackets,
      previousDelimiter: this.delimiters,
      index,
      image,
      active: true,
    };
  }

  removeBracket() {
    if (this.brackets) {
      this.brackets = this.brackets.previous;
    }
  }

  // Attempt to parse an entity.
  parseEntity(block: BlockNode) {
    let m;
    const startpos = this.pos + 1;
    if ((m = this.match(reEntityHere))) {
      block.appendChild(text(decodeHTML(m), this.sourcepos(startpos, this.pos)));
      return true;
    }
    return false;
  }

  // Parse a run of ordinary characters, or a single character with
  // a special meaning in markdown, as a plain string.
  parseString(block: BlockNode) {
    let m;
    const startpos = this.pos + 1;

    if ((m = this.match(reMain))) {
      if (this.options.smart) {
        const lit = m.replace(reEllipses, '\u2026').replace(reDash, function (chars) {
          let enCount = 0;
          let emCount = 0;
          if (chars.length % 3 === 0) {
            // If divisible by 3, use all em dashes
            emCount = chars.length / 3;
          } else if (chars.length % 2 === 0) {
            // If divisible by 2, use all en dashes
            enCount = chars.length / 2;
          } else if (chars.length % 3 === 2) {
            // If 2 extra dashes, use en dash for last 2; em dashes for rest
            enCount = 1;
            emCount = (chars.length - 2) / 3;
          } else {
            // Use en dashes for last 4 hyphens; em dashes for rest
            enCount = 2;
            emCount = (chars.length - 4) / 3;
          }
          return repeat('\u2014', emCount) + repeat('\u2013', enCount);
        });
        block.appendChild(text(lit, this.sourcepos(startpos, this.pos)));
      } else {
        const node = text(m, this.sourcepos(startpos, this.pos));
        block.appendChild(node);
      }
      return true;
    }
    return false;
  }

  // Parse a newline.  If it was preceded by two spaces, return a hard
  // line break; otherwise a soft line break.
  parseNewline(block: BlockNode) {
    this.pos += 1; // assume we're at a \n

    // check previous node for trailing spaces
    const lastc = block.lastChild;
    if (lastc && lastc.type === 'text' && lastc.literal![lastc.literal!.length - 1] === ' ') {
      const hardbreak = lastc.literal![lastc.literal!.length - 2] === ' ';
      const litLen = lastc.literal!.length;
      lastc.literal = lastc.literal!.replace(reFinalSpace, '');
      const finalSpaceLen = litLen - lastc.literal.length;
      lastc.sourcepos![1][1] -= finalSpaceLen;

      block.appendChild(
        createNode(
          hardbreak ? 'linebreak' : 'softbreak',
          this.sourcepos(this.pos - finalSpaceLen, this.pos)
        )
      );
    } else {
      block.appendChild(createNode('softbreak', this.sourcepos(this.pos, this.pos)));
    }
    this.nextLine();
    this.match(reInitialSpace); // gobble leading spaces in next line
    return true;
  }

  // Attempt to parse a link reference, modifying refmap.
  parseReference(block: BlockNode, refMap: RefMap) {
    if (!this.options.referenceDefinition) {
      return 0;
    }

    this.subject = block.stringContent!;
    this.pos = 0;
    let title = null;
    const startpos = this.pos;

    // label:
    const matchChars = this.parseLinkLabel();
    if (matchChars === 0) {
      return 0;
    }
    const rawlabel = this.subject.substr(0, matchChars);

    // colon:
    if (this.peek() === C_COLON) {
      this.pos++;
    } else {
      this.pos = startpos;
      return 0;
    }

    //  link url
    this.spnl();

    const dest = this.parseLinkDestination();
    if (dest === null) {
      this.pos = startpos;
      return 0;
    }

    const beforetitle = this.pos;
    this.spnl();
    if (this.pos !== beforetitle) {
      title = this.parseLinkTitle();
    }
    if (title === null) {
      title = '';
      // rewind before spaces
      this.pos = beforetitle;
    }

    // make sure we're at line end:
    let atLineEnd = true;
    if (this.match(reSpaceAtEndOfLine) === null) {
      if (title === '') {
        atLineEnd = false;
      } else {
        // the potential title we found is not at the line end,
        // but it could still be a legal link reference if we
        // discard the title
        title = '';
        // rewind before spaces
        this.pos = beforetitle;
        // and instead check if the link URL is at the line end
        atLineEnd = this.match(reSpaceAtEndOfLine) !== null;
      }
    }

    if (!atLineEnd) {
      this.pos = startpos;
      return 0;
    }

    const normalLabel = normalizeReference(rawlabel);
    if (normalLabel === '') {
      // label must contain non-whitespace characters
      this.pos = startpos;
      return 0;
    }

    const sourcepos = this.getReferenceDefSourcepos(block);
    block.sourcepos![0][0] = sourcepos[1][0] + 1;

    const node = createNode('refDef', sourcepos);
    node.title = title;
    node.dest = dest;
    node.label = normalLabel;

    block.insertBefore(node);

    if (!refMap[normalLabel]) {
      refMap[normalLabel] = createRefDefState(node);
    } else {
      this.refDefCandidateMap[node.id] = node;
    }

    return this.pos - startpos;
  }

  mergeTextNodes(walker: NodeWalker) {
    let event;
    let textNodes: Node[] = [];

    while ((event = walker.next())) {
      const { entering, node } = event;
      if (entering && node.type === 'text') {
        textNodes.push(node);
      } else if (textNodes.length === 1) {
        textNodes = [];
      } else if (textNodes.length > 1) {
        const firstNode = textNodes[0];
        const lastNode = textNodes[textNodes.length - 1];
        if (firstNode.sourcepos && lastNode.sourcepos) {
          firstNode.sourcepos![1] = lastNode.sourcepos![1];
        }
        firstNode.next = lastNode.next;
        if (firstNode.next) {
          firstNode.next.prev = firstNode;
        }

        for (let i = 1; i < textNodes.length; i += 1) {
          firstNode.literal! += textNodes[i].literal;
          textNodes[i].unlink();
        }
        textNodes = [];
      }
    }
  }

  getReferenceDefSourcepos(block: BlockNode): Sourcepos {
    const lines = block.stringContent!.split(/\n|\r\n/);
    let passedUrlLine = false;
    let quotationCount = 0;
    let lastLineOffset = { line: 0, ch: 0 };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (reWhitespaceChar.test(line)) {
        break;
      }
      if (/\:/.test(line) && quotationCount === 0) {
        if (passedUrlLine) {
          break;
        }
        const lineOffset = line.indexOf(':') === line.length - 1 ? i + 1 : i;
        lastLineOffset = { line: lineOffset, ch: lines[lineOffset].length };
        passedUrlLine = true;
      }
      // should consider extendable title
      const matched = line.match(/'|"/g);
      if (matched) {
        quotationCount += matched.length;
      }
      if (quotationCount === 2) {
        lastLineOffset = { line: i, ch: line.length };
        break;
      }
    }
    return [
      [block.sourcepos![0][0], block.sourcepos![0][1]],
      [block.sourcepos![0][0] + lastLineOffset.line, lastLineOffset.ch],
    ];
  }

  // Parse the next inline element in subject, advancing subject position.
  // On success, add the result to block's children and return true.
  // On failure, return false.
  parseInline(block: BlockNode) {
    let res = false;
    const c = this.peek();
    if (c === -1) {
      return false;
    }

    switch (c) {
      case C_NEWLINE:
        res = this.parseNewline(block);
        break;
      case C_BACKSLASH:
        res = this.parseBackslash(block);
        break;
      case C_BACKTICK:
        res = this.parseBackticks(block);
        break;
      case C_ASTERISK:
      case C_UNDERSCORE:
      case C_TILDE:
      case C_DOLLAR:
        res = this.handleDelim(c, block);
        break;
      case C_SINGLEQUOTE:
      case C_DOUBLEQUOTE:
        res = !!this.options?.smart && this.handleDelim(c, block);
        break;
      case C_OPEN_BRACKET:
        res = this.parseOpenBracket(block);
        break;
      case C_BANG:
        res = this.parseBang(block);
        break;
      case C_CLOSE_BRACKET:
        res = this.parseCloseBracket(block);
        break;
      case C_LESSTHAN:
        res = this.parseAutolink(block) || this.parseHtmlTag(block);
        break;
      case C_AMPERSAND:
        if (!(block as CustomBlockMdNode).disabledEntityParse) {
          res = this.parseEntity(block);
        }
        break;
      default:
        res = this.parseString(block);
        break;
    }

    if (!res) {
      this.pos += 1;
      block.appendChild(text(fromCodePoint(c), this.sourcepos(this.pos, this.pos + 1)));
    }

    return true;
  }

  // Parse string content in block into inline children,
  // using refmap to resolve references.
  parse(block: BlockNode) {
    this.subject = block.stringContent!.trim();
    this.pos = 0;
    this.delimiters = null;
    this.brackets = null;
    this.lineOffsets = block.lineOffsets || [0];
    this.lineIdx = 0;
    this.linePosOffset = 0;
    this.lineStartNum = block.sourcepos![0][0];
    if (isHeading(block)) {
      this.lineOffsets[0] += block.level + 1;
    }

    while (this.parseInline(block)) {}
    block.stringContent = null; // allow raw string to be garbage collected
    this.processEmphasis(null);
    this.mergeTextNodes(block.walker());

    const { extendedAutolinks, customParser } = this.options;
    if (extendedAutolinks) {
      convertExtAutoLinks(block.walker(), extendedAutolinks);
    }
    if (customParser && block.firstChild) {
      let event;
      const walker = block.firstChild.walker();

      while ((event = walker.next())) {
        const { node, entering } = event;
        if (customParser[node.type]) {
          customParser[node.type]!(node, { entering, options: this.options });
        }
      }
    }
  }
}
