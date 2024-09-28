import { deleteSelection, selectAll } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';

import { EditorCommand } from '@t/spec';

export function getDefaultCommands(): Record<string, EditorCommand> {
  return {
    deleteSelection: () => deleteSelection,
    selectAll: () => selectAll,
    undo: () => (state, dispatch) => {
      const hist = state.history$;

      // The initial state is not counted as a history event
      if (!hist || hist.done.eventCount === 1) return false;
      undo(state, dispatch);
      return true;
    },
    redo: () => redo,
  };
}
