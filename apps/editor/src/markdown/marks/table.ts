import { DOMOutputSpecArray } from 'prosemirror-model';
import { Command } from 'prosemirror-commands';
import { TableCellMdNode, MdNode, MdPos, TableMdNode } from '@toast-ui/toastmark';
import { TableRowMdNode } from '@t/markdown';
import { EditorCommand, MdSpecContext } from '@t/spec';
import { clsWithMdPrefix } from '@/utils/dom';
import { findClosestNode, getMdEndCh, isTableCellNode } from '@/utils/markdown';
import Mark from '@/spec/mark';
import { getRangeInfo } from '../helper/pos';
import {
  createParagraph,
  createTextSelection,
  insertNodes,
  replaceNodes,
} from '@/helper/manipulation';

interface Payload {
  columnCount: number;
  rowCount: number;
}

interface MovingTypeInfo {
  type: 'next' | 'prev';
  parentType: 'tableHead' | 'tableBody';
  childType: 'firstChild' | 'lastChild';
}

const reEmptyTable = /\||\s/g;

function createTableHeader(columnCount: number) {
  return [createTableRow(columnCount), createTableRow(columnCount, true)];
}

function createTableBody(columnCount: number, rowCount: number) {
  const bodyRows = [];

  for (let i = 0; i < rowCount; i += 1) {
    bodyRows.push(createTableRow(columnCount));
  }

  return bodyRows;
}

function createTableRow(columnCount: number, delim?: boolean) {
  let row = '|';

  for (let i = 0; i < columnCount; i += 1) {
    row += delim ? ' --- |' : '  |';
  }
  return row;
}

function createTargetTypes(moveNext: boolean): MovingTypeInfo {
  return moveNext
    ? { type: 'next', parentType: 'tableHead', childType: 'firstChild' }
    : { type: 'prev', parentType: 'tableBody', childType: 'lastChild' };
}

export class Table extends Mark {
  context!: MdSpecContext;

  get name() {
    return 'table';
  }

  get defaultSchema() {
    return {
      toDOM(): DOMOutputSpecArray {
        return ['span', { class: clsWithMdPrefix('table') }, 0];
      },
    };
  }

  private extendTable(): Command {
    return ({ selection, doc, tr, schema }, dispatch) => {
      const { startOffset, endOffset, endStartOffset, endIndex, to } = getRangeInfo(selection);
      const { textContent } = doc.child(endIndex);
      const mdPos = [endIndex + 1, to - endStartOffset];

      const mdNode: MdNode = this.context.toastMark.findNodeAtPosition(mdPos);
      const cellNode = findClosestNode(
        mdNode,
        (node) =>
          isTableCellNode(node) &&
          (node.parent!.type === 'tableDelimRow' || node.parent!.parent!.type === 'tableBody')
      ) as TableCellMdNode;

      if (cellNode) {
        const isEmpty = !textContent.replace(reEmptyTable, '').trim();
        const columnCount = cellNode.parent.parent.parent.columns.length;
        const row = createTableRow(columnCount);

        if (isEmpty) {
          const emptyNode = createParagraph(schema);

          dispatch!(replaceNodes(tr, startOffset, endOffset, [emptyNode, emptyNode]));
        } else {
          const newTr = insertNodes(tr, endOffset, createParagraph(schema, row));

          dispatch!(newTr.setSelection(createTextSelection(newTr, endOffset + 4)));
        }
        return true;
      }
      return false;
    };
  }

  private moveTableCell(moveNext: boolean): Command {
    return ({ selection, tr }, dispatch) => {
      const { endStartOffset, endIndex, to } = getRangeInfo(selection);
      const mdPos = [endIndex + 1, to - endStartOffset];
      const mdNode: MdNode = this.context.toastMark.findNodeAtPosition(mdPos);
      const cellNode = findClosestNode(mdNode, (node) => isTableCellNode(node)) as TableCellMdNode;

      if (cellNode) {
        const { parent } = cellNode;
        const { type, parentType, childType } = createTargetTypes(moveNext);
        let chOffset = getMdEndCh(cellNode);

        if (cellNode[type]) {
          chOffset = getMdEndCh(cellNode[type]!) - 1;
        } else {
          const row =
            !parent[type] && parent.parent.type === parentType
              ? parent.parent[type]![childType]
              : parent[type];

          if (type === 'next') {
            // if there is next row, the base offset would be end position of the next row's first child.
            // Otherwise, the base offset is zero.
            const baseOffset = row ? getMdEndCh(row[childType]!) : 0;

            // calculate ' |' character position('2') for selection
            chOffset += baseOffset + 2;
          } else if (type === 'prev') {
            // if there is prev row, the target position would be '-4' for calculating ' |' characters twice times
            // Otherwise, the target position is zero.
            chOffset = row ? -4 : 0;
          }
        }

        const pos = endStartOffset + chOffset;

        dispatch!(tr.setSelection(createTextSelection(tr, pos)));

        return true;
      }
      return false;
    };
  }

  private addTable(): EditorCommand<Payload> {
    return (payload) => ({ selection, tr, schema }, dispatch) => {
      const { columnCount, rowCount } = payload!;
      const { endOffset } = getRangeInfo(selection);

      const headerRows = createTableHeader(columnCount);
      const bodyRows = createTableBody(columnCount, rowCount - 1);

      const nodes = [...headerRows, ...bodyRows].map((row) => createParagraph(schema, row));
      const newTr = insertNodes(tr, endOffset, nodes);

      dispatch!(tr.setSelection(createTextSelection(newTr, endOffset + 4)));

      return true;
    };
  }

  commands() {
    return { addTable: this.addTable() };
  }

  keymaps() {
    return {
      Enter: this.extendTable(),
      Tab: this.moveTableCell(true),
      'Shift-Tab': this.moveTableCell(false),
    };
  }
}
