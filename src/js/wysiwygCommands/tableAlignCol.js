/**
 * @fileoverview Implements WysiwygCommand
 * @author Sungho Kim(sungho-kim@nhnent.com) FE Development Team/NHN Ent.
 * @author Junghwan Park(junghwan.park@nhnent.com) FE Development Team/NHN Ent.
 */


import CommandManager from '../commandManager';
import domUtil from '../domUtils';

/**
 * AlignCol
 * Align selected column's text content to given direction
 * @exports AlignCol
 * @augments Command
 * @augments WysiwygCommand
 * @ignore
 */
const AlignCol = CommandManager.command('wysiwyg', /** @lends AlignCol */{
    name: 'AlignCol',
    /**
     * 커맨드 핸들러
     * @param {WysiwygEditor} wwe WYsiwygEditor instance
     * @param {string} alignDirection Align direction
     */
    exec(wwe, alignDirection) {
        const sq = wwe.getEditor();
        const range = sq.getSelection().cloneRange();
        const selectionMgr = wwe.componentManager.getManager('tableSelection');
        const rangeInformation = getRangeInformation(range, selectionMgr);

        sq.focus();

        if (sq.hasFormat('TR')) {
            sq.saveUndoState(range);

            const $table = $(range.startContainer).parents('table');

            const selectionInformation = getSelectionInformation($table, rangeInformation);

            setAlignAttributeToTableCells($table, alignDirection, selectionInformation);
        }
        selectionMgr.removeClassAttrbuteFromAllCellsIfNeed();
    }
});

/**
 * Set Column align
 * @param {jQuery} $table jQuery wrapped TABLE
 * @param {string} alignDirection 'left' or 'center' or 'right'
 * @param {{
 *     startColumnIndex: number,
 *     endColumnIndex: number,
 *     isDivided: boolean
 *     }} selectionInformation start, end column index and boolean value for whether range divided or not
 */
function setAlignAttributeToTableCells($table, alignDirection, selectionInformation) {
    const isDivided = selectionInformation.isDivided || false;
    const start = selectionInformation.startColumnIndex;
    const end = selectionInformation.endColumnIndex;
    const columnLength = $table.find('tr').eq(0).find('td,th').length;

    $table.find('tr').each((n, tr) => {
        $(tr).children('td,th').each((index, cell) => {
            if (isDivided &&
                ((start <= index && index <= columnLength) || (index <= end))
            ) {
                $(cell).attr('align', alignDirection);
            } else if ((start <= index && index <= end)) {
                $(cell).attr('align', alignDirection);
            }
        });
    });
}

/**
 * Return start, end column index and boolean value for whether range divided or not
 * @param {jQuery} $table jQuery wrapped TABLE
 * @param {{startColumnIndex: number, endColumnIndex: number}} rangeInformation Range information
 * @returns {{startColumnIndex: number, endColumnIndex: number, isDivided: boolean}}
 */
function getSelectionInformation($table, rangeInformation) {
    const columnLength = $table.find('tr').eq(0).find('td,th').length;
    const from = rangeInformation.from;
    const to = rangeInformation.to;
    let startColumnIndex, endColumnIndex, isDivided;

    if (from.row === to.row) {
        startColumnIndex = from.cell;
        endColumnIndex = to.cell;
    } else if (from.row < to.row) {
        if (from.cell <= to.cell) {
            startColumnIndex = 0;
            endColumnIndex = columnLength - 1;
        } else {
            startColumnIndex = from.cell;
            endColumnIndex = to.cell;
            isDivided = true;
        }
    }

    return {
        startColumnIndex,
        endColumnIndex,
        isDivided
    };
}

/**
 * Get range information
 * @param {Range} range Range object
 * @param {object} selectionMgr Table selection manager
 * @returns {object}
 */
function getRangeInformation(range, selectionMgr) {
    const selectedCells = selectionMgr.getSelectedCells();
    let rangeInformation, startCell;

    if (selectedCells.length) {
        rangeInformation = selectionMgr.getSelectionRangeFromTable(selectedCells.first()[0],
            selectedCells.last()[0]);
    } else {
        const startContainer = range.startContainer;
        startCell = domUtil.isTextNode(startContainer) ? $(startContainer).parent('td,th')[0] : startContainer;
        rangeInformation = selectionMgr.getSelectionRangeFromTable(startCell, startCell);
    }

    return rangeInformation;
}

module.exports = AlignCol;
