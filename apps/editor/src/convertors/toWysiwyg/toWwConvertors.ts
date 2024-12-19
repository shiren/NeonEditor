import {
  MdNode,
  HeadingMdNode,
  CodeBlockMdNode,
  ListItemMdNode,
  LinkMdNode,
  TableCellMdNode,
  CustomBlockMdNode,
  CustomInlineMdNode,
  TableMdNode,
  HTMLConvertorMap,
  OpenTagToken,
  Renderer,
} from '@toast-ui/toastmark';
import toArray from 'tui-code-snippet/collection/toArray';

import { isElemNode } from '@/utils/dom';

import {
  htmlToWwConvertors,
  getTextWithoutTrailingNewline,
  isInlineNode,
  isCustomHTMLInlineNode,
  isCustomInline,
} from './htmlToWwConvertors';

import { ToWwConvertorMap } from '@t/convertor';
import { createWidgetContent, getWidgetContent } from '@/widget/rules';
import { getChildrenHTML, getHTMLAttrsByHTMLString } from '@/wysiwyg/nodes/html';
import { includes } from '@/utils/common';
import { reBR, reHTMLTag, reHTMLComment } from '@/utils/constants';
import { sanitizeHTML } from '@/sanitizer/htmlSanitizer';

function isBRTag(node: MdNode) {
  return node.type === 'htmlInline' && reBR.test(node.literal!);
}

function addRawHTMLAttributeToDOM(parent: Node) {
  toArray(parent.childNodes).forEach((child) => {
    if (isElemNode(child)) {
      const openTagName = child.nodeName.toLowerCase();

      (child as HTMLElement).setAttribute('data-raw-html', openTagName);

      if (child.childNodes) {
        addRawHTMLAttributeToDOM(child);
      }
    }
  });
}

const toWwConvertors: ToWwConvertorMap = {
  text(state, node) {
    state.addText(node.literal || '');
  },

  paragraph(state, node, { entering }, customAttrs) {
    if (entering) {
      const { paragraph } = state.schema.nodes;

      // The `\n\n` entered in markdown separates the paragraph.
      // When changing to wysiwyg, a newline is added between the two paragraphs.
      if (node.prev?.type === 'paragraph') {
        state.openNode(paragraph, customAttrs);
        state.closeNode();
      }

      state.openNode(paragraph, customAttrs);
    } else {
      state.closeNode();
    }
  },

  heading(state, node, { entering }, customAttrs) {
    if (entering) {
      const { level, headingType } = node as HeadingMdNode;

      state.openNode(state.schema.nodes.heading, { level, headingType, ...customAttrs });
    } else {
      state.closeNode();
    }
  },

  codeBlock(state, node, customAttrs) {
    const { codeBlock } = state.schema.nodes;
    const { info, literal } = node as CodeBlockMdNode;

    state.openNode(codeBlock, { language: info, ...customAttrs });
    state.addText(getTextWithoutTrailingNewline(literal || ''));
    state.closeNode();
  },

  list(state, node, { entering }, customAttrs) {
    if (entering) {
      const { bulletList, orderedList } = state.schema.nodes;
      const { type, start } = (node as ListItemMdNode).listData;

      if (type === 'bullet') {
        state.openNode(bulletList, customAttrs);
      } else {
        state.openNode(orderedList, { order: start, ...customAttrs });
      }
    } else {
      state.closeNode();
    }
  },

  item(state, node, { entering }, customAttrs) {
    const { listItem } = state.schema.nodes;
    const { task, checked } = (node as ListItemMdNode).listData;

    if (entering) {
      const attrs = {
        ...(task && { task }),
        ...(checked && { checked }),
        ...customAttrs,
      };

      state.openNode(listItem, attrs);
    } else {
      state.closeNode();
    }
  },

  blockQuote(state, _, { entering }, customAttrs) {
    if (entering) {
      state.openNode(state.schema.nodes.blockQuote, customAttrs);
    } else {
      state.closeNode();
    }
  },

  image(state, node, { entering, skipChildren }, customAttrs) {
    const { image } = state.schema.nodes;
    const { destination, firstChild } = node as LinkMdNode;

    if (entering && skipChildren) {
      skipChildren();
    }

    state.addNode(image, {
      imageUrl: destination,
      ...(firstChild && { altText: firstChild.literal }),
      ...customAttrs,
    });
  },

  thematicBreak(state, node, _, customAttrs) {
    state.addNode(state.schema.nodes.thematicBreak, customAttrs);
  },

  strong(state, _, { entering }, customAttrs) {
    const { strong } = state.schema.marks;

    if (entering) {
      state.openMark(strong.create(customAttrs));
    } else {
      state.closeMark(strong);
    }
  },

  emph(state, _, { entering }, customAttrs) {
    const { emph } = state.schema.marks;

    if (entering) {
      state.openMark(emph.create(customAttrs));
    } else {
      state.closeMark(emph);
    }
  },

  link(state, node, { entering }, customAttrs) {
    const { link } = state.schema.marks;
    const { destination, title } = node as LinkMdNode;

    if (entering) {
      const attrs = {
        linkUrl: destination,
        title,
        ...customAttrs,
      };

      state.openMark(link.create(attrs));
    } else {
      state.closeMark(link);
    }
  },

  softbreak(state, node) {
    if (node.parent!.type === 'paragraph') {
      const { prev, next } = node;

      if (prev && !isBRTag(prev)) {
        state.closeNode();
      }

      if (next && !isBRTag(next)) {
        state.openNode(state.schema.nodes.paragraph);
      }
    }
  },

  // GFM specifications node
  table(state, _, { entering }, customAttrs) {
    if (entering) {
      state.openNode(state.schema.nodes.table, customAttrs);
    } else {
      state.closeNode();
    }
  },

  tableHead(state, _, { entering }, customAttrs) {
    if (entering) {
      state.openNode(state.schema.nodes.tableHead, customAttrs);
    } else {
      state.closeNode();
    }
  },

  tableBody(state, _, { entering }, customAttrs) {
    if (entering) {
      state.openNode(state.schema.nodes.tableBody, customAttrs);
    } else {
      state.closeNode();
    }
  },

  tableRow(state, _, { entering }, customAttrs) {
    if (entering) {
      state.openNode(state.schema.nodes.tableRow, customAttrs);
    } else {
      state.closeNode();
    }
  },

  tableCell(state, node, { entering }) {
    if (!(node as TableCellMdNode).ignored) {
      const hasParaNode = (childNode: MdNode | null) =>
        childNode &&
        (isInlineNode(childNode) ||
          isCustomInline(childNode) ||
          isCustomHTMLInlineNode(state, childNode));

      if (entering) {
        const { tableHeadCell, tableBodyCell, paragraph } = state.schema.nodes;
        const tablePart = node.parent!.parent!;
        const cell = tablePart.type === 'tableHead' ? tableHeadCell : tableBodyCell;

        const table = tablePart.parent as TableMdNode;
        const { align } = table.columns[(node as TableCellMdNode).startIdx] || {};
        const attrs: Record<string, string | number> = { ...(node as TableCellMdNode).attrs };

        if (align) {
          attrs.align = align;
        }

        state.openNode(cell, attrs);

        if (hasParaNode(node.firstChild)) {
          state.openNode(paragraph);
        }
      } else {
        if (hasParaNode(node.lastChild)) {
          state.closeNode();
        }
        state.closeNode();
      }
    }
  },

  strike(state, _, { entering }, customAttrs) {
    const { strike } = state.schema.marks;

    if (entering) {
      state.openMark(strike.create(customAttrs));
    } else {
      state.closeMark(strike);
    }
  },

  code(state, node, _, customAttrs) {
    const { code } = state.schema.marks;

    state.openMark(code.create(customAttrs));
    state.addText(getTextWithoutTrailingNewline(node.literal || ''));
    state.closeMark(code);
  },

  customBlock(state, node) {
    const { customBlock, paragraph } = state.schema.nodes;
    const { info, literal } = node as CustomBlockMdNode;

    state.openNode(customBlock, { info });
    state.addText(getTextWithoutTrailingNewline(literal || ''));
    state.closeNode();
    // add empty line to edit the content in next line
    if (!node.next) {
      state.openNode(paragraph);
      state.closeNode();
    }
  },

  frontMatter(state, node) {
    state.openNode(state.schema.nodes.frontMatter);
    state.addText(node.literal!);
    state.closeNode();
  },

  htmlInline(state, node) {
    const html = node.literal!;
    const matched = html.match(reHTMLTag)!;
    const [, openTagName, , closeTagName] = matched;
    const typeName = (openTagName || closeTagName).toLowerCase();
    const markType = state.schema.marks[typeName];
    const sanitizedHTML = sanitizeHTML(html);

    // for user defined html schema
    if (markType?.spec.attrs!.htmlInline) {
      if (openTagName) {
        const htmlAttrs = getHTMLAttrsByHTMLString(sanitizedHTML);

        state.openMark(markType.create({ htmlAttrs }));
      } else {
        state.closeMark(markType);
      }
    } else {
      const htmlToWwConvertor = htmlToWwConvertors[typeName];

      if (htmlToWwConvertor) {
        htmlToWwConvertor(state, node, openTagName);
      }
    }
  },

  htmlBlock(state, node) {
    const html = node.literal!;
    const container = document.createElement('div');
    const isHTMLComment = reHTMLComment.test(html);

    if (isHTMLComment) {
      state.openNode(state.schema.nodes.htmlComment);
      state.addText(node.literal!);
      state.closeNode();
    } else {
      const matched = html.match(reHTMLTag)!;
      const [, openTagName, , closeTagName] = matched;

      const typeName = (openTagName || closeTagName).toLowerCase();
      const nodeType = state.schema.nodes[typeName];
      const sanitizedHTML = sanitizeHTML(html);

      // for user defined html schema
      if (nodeType?.spec.attrs!.htmlBlock) {
        const htmlAttrs = getHTMLAttrsByHTMLString(sanitizedHTML);
        const childrenHTML = getChildrenHTML(node, typeName);

        state.addNode(nodeType, { htmlAttrs, childrenHTML });
      } else {
        container.innerHTML = sanitizedHTML;
        addRawHTMLAttributeToDOM(container);

        state.convertByDOMParser(container as HTMLElement);
      }
    }
  },

  customInline(state, node, { entering, skipChildren }) {
    const { info, firstChild } = node as CustomInlineMdNode;
    const { schema } = state;

    if (info.indexOf('widget') !== -1 && entering) {
      const content = getWidgetContent(node as CustomInlineMdNode);

      skipChildren();

      state.addNode(schema.nodes.widget, { info }, [
        schema.text(createWidgetContent(info, content)),
      ]);
    } else {
      let text = '$$';

      if (entering) {
        text += firstChild ? `${info} ` : info;
      }

      state.addText(text);
    }
  },
};

export function createWwConvertors(customConvertors: HTMLConvertorMap) {
  const customConvertorTypes = Object.keys(customConvertors);
  const convertors = { ...toWwConvertors };
  const renderer = new Renderer({
    gfm: true,
    nodeId: true,
    convertors: customConvertors,
  });
  const orgConvertors = renderer.getConvertors();

  customConvertorTypes.forEach((type) => {
    const wwConvertor = toWwConvertors[type];

    if (wwConvertor && !includes(['htmlBlock', 'htmlInline'], type)) {
      convertors[type] = (state, node, context) => {
        context.origin = () => orgConvertors[type]!(node, context, orgConvertors);
        const tokens = customConvertors[type]!(node, context) as OpenTagToken;
        let attrs;

        if (tokens) {
          const { attributes: htmlAttrs, classNames } = Array.isArray(tokens) ? tokens[0] : tokens;

          attrs = { htmlAttrs, classNames };
        }

        wwConvertor(state, node, context, attrs);
      };
    }
  });

  return convertors;
}
