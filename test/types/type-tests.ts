import Editor from 'tui-editor';
import EditorAll from 'tui-editor/dist/tui-editor-Editor-all';
import Viewer from 'tui-editor/dist/tui-editor-Viewer';
import ViewerAll from 'tui-editor/dist/tui-editor-Viewer-all';

const editor2 = new EditorAll({
  el: document.getElementById('editor'),
  height: '200px',
  minHeight: '100px',
  toolbarItems: ['test', 'test2', 'test3'],
  useCommandShortcut: true
});

editor2.changeMode('wysiwyg', true);

const editor:Editor = new Editor({
  el: document.querySelector('#el'),
  initialValue: '# HELLO TOAST UI EDITOR!'
});

new Editor.Button({
  className: 'editor-btn',
  $el: $('#container')
});
Editor.codeBlockManager;
Editor.codeBlockManager.createCodeBlockHtml('en_US', 'Hello World');
Editor.codeBlockManager.getReplacer('youtube');
const cm = new Editor.CommandManager(editor);
const tuiCommand = tuiEditor.Command;
tuiCommand.TYPE.GB;
tuiCommand.TYPE.MD;
tuiCommand.TYPE.WW;
const cmd = new tuiCommand('enter', 13);
const tuiCmdManagerCmd = tuiEditor.CommandManager.command('shift', {name: 'shift'});
const command = cm.addCommand(cmd);
command.getName();
command.getType();
command.isGlobalType();
command.isMDType();
command.isWWType();

Editor.domUtils;
Editor.i18n;
Editor.isViewer;
Editor.markdownitHighlight;
const wwe = editor.getCurrentModeEditor() as tuiEditor.WysiwygEditor;
new Editor.WwCodeBlockManager(wwe);
new Editor.WwTableManager(wwe);
new Editor.WwTableSelectionManager(wwe);

Editor.defineExtension('youtube', () => { return '<div></div>'});
Editor.factory({el: document.querySelector('#editorSectoin')});
Editor.getInstances().length == 1;

editor.addHook('click', () => { console.log('click Handler!')});
const selection = new Range();
editor.addWidget(selection, document.querySelector('#editorSectoin'), 'bottom', 20);
editor.afterAddedCommand();
editor.blur();
editor.changeMode('markdown', false);
editor.changePreviewStyle('tab');
editor.exec('delete');
editor.focus();
editor.getCodeMirror();
editor.getCurrentModeEditor();
editor.getCurrentPreviewStyle();
editor.getHtml();
editor.getMarkdown();
editor.getRange();
editor.getSelectedText();
editor.getSquire();
editor.getTextObject(selection);
editor.getUI();
editor.getValue();
editor.height('300px');
editor.hide();
editor.insertText('TYPE CHECKING!');
editor.isMarkdownMode();
editor.isViewer();
editor.isWysiwygMode();
editor.minHeight('150px');
editor.moveCursorToEnd();
editor.moveCursorToStart();
editor.off('click');
editor.on('click', (e, test) => console.log(e.target, test));
editor.remove();
editor.removeHook('click');
editor.reset();
editor.scrollTop(0);
editor.setHtml('<div>HELLO</div>');
editor.setMarkdown('### Delicious Web!', true);
const customUI = new tuiEditor.DefaultUI(editor);
editor.setUI(customUI);
editor.setValue('* using TOAST UI');
editor.show();

const viewer:Viewer = new Viewer({
  el: document.querySelector('#el'),
  exts: ['chart', 'youtube']
});

Viewer.codeBlockManager;
Viewer.domUtils;
Viewer.isViewer;
Viewer.markdownitHighlight;

Viewer.defineExtension('youtube', () => {});

viewer.addHook('click', () => { return 1; });
viewer.isMarkdownMode();
viewer.isViewer();
viewer.isWysiwygMode();
viewer.off('click');
viewer.on('click', e => { return 1; });
viewer.remove();
viewer.setMarkdown('### I am Viewer!');
viewer.setValue('### I am setValue method!');
Editor.getInstances().length == 1;

const viewer2 = new ViewerAll({
  el: document.querySelector('#el')
});
viewer2.isViewer();
