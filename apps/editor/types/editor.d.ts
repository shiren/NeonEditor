import { Schema, NodeSpec, MarkSpec, Fragment } from 'prosemirror-model';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { EditorState, Plugin, PluginKey, Selection, TextSelection } from 'prosemirror-state';
import { undoInputRule, InputRule, inputRules } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { Editor } from '@t/index';

import {
  HTMLConvertor,
  MdPos,
  Sourcepos,
  Context as MdContext,
  HTMLToken,
  HTMLConvertorMap,
} from './toastmark';
import { Emitter, Handler } from './event';
import { Context, EditorAllCommandMap, EditorCommandFn, SpecManager } from './spec';
import { ToMdConvertorMap } from './convertor';
import { ToolbarItemOptions, IndexList } from './ui';
import { CommandFn, PluginInfo } from './plugin';
import { HTMLMdNode } from './markdown';

export type PreviewStyle = 'tab' | 'vertical';
export type EditorType = 'markdown' | 'wysiwyg';
export type WidgetStyle = 'top' | 'bottom';
export interface WidgetRule {
  rule: RegExp;
  toDOM: (text: string) => HTMLElement;
}

export type WidgetRuleMap = Record<string, WidgetRule>;

export interface EventMap {
  load?: (param: Editor) => void;
  change?: (editorType: EditorType) => void;
  caretChange?: (editorType: EditorType) => void;
  focus?: (editorType: EditorType) => void;
  blur?: (editorType: EditorType) => void;
  keydown?: (editorType: EditorType, ev: KeyboardEvent) => void;
  keyup?: (editorType: EditorType, ev: KeyboardEvent) => void;
  beforePreviewRender?: (html: string) => string;
  beforeConvertWysiwygToMarkdown?: (markdownText: string) => string;
}

type HookCallback = (url: string, text?: string) => void;

export type HookMap = {
  addImageBlobHook?: (blob: Blob | File, callback: HookCallback) => void;
};

export type AutolinkParser = (
  content: string
) => {
  url: string;
  text: string;
  range: [number, number];
}[];

export type ExtendedAutolinks = boolean | AutolinkParser;

export type LinkAttributeNames = 'rel' | 'target' | 'hreflang' | 'type';

// @TODO change option and type name from singular to plural
export type LinkAttributes = Partial<Record<LinkAttributeNames, string>>;

export type Sanitizer = (content: string) => string;

export type HTMLMdNodeConvertor = (
  node: HTMLMdNode,
  context: MdContext,
  convertors?: HTMLConvertorMap
) => HTMLToken | HTMLToken[] | null;

export type HTMLMdNodeConvertorMap = Record<string, HTMLMdNodeConvertor>;

export type CustomHTMLRenderer = Partial<Record<string, HTMLConvertor | HTMLMdNodeConvertorMap>>;

export interface ViewerOptions {
  el: HTMLElement;
  initialValue?: string;
  events?: EventMap;
  plugins?: EditorPlugin[];
  extendedAutolinks?: ExtendedAutolinks;
  linkAttributes?: LinkAttributes;
  customHTMLRenderer?: CustomHTMLRenderer;
  referenceDefinition?: boolean;
  customHTMLSanitizer?: Sanitizer;
  frontMatter?: boolean;
  usageStatistics?: boolean;
  theme?: string;
}

export class Viewer {
  static isViewer: boolean;

  constructor(options: ViewerOptions);

  setMarkdown(markdown: string): void;

  on(type: string, handler: Handler): void;

  off(type: string): void;

  destroy(): void;

  isViewer(): boolean;

  isMarkdownMode(): boolean;

  isWysiwygMode(): boolean;

  addHook(type: string, handler: Handler): void;
}

export interface I18n {
  setCode(code?: string): void;

  setLanguage(codes: string | string[], data: Record<string, string>): void;

  get(key: string, code?: string): string;
}

export interface PluginContext {
  eventEmitter: Emitter;
  usageStatistics?: boolean;
  i18n: I18n;
  instance: Editor | Viewer;
  pmState: {
    Plugin: typeof Plugin;
    PluginKey: typeof PluginKey;
    Selection: typeof Selection;
    TextSelection: typeof TextSelection;
  };
  pmView: { Decoration: typeof Decoration; DecorationSet: typeof DecorationSet };
  pmModel: { Fragment: typeof Fragment };
  pmRules: {
    inputRules: typeof inputRules;
    InputRule: typeof InputRule;
    undoInputRule: typeof undoInputRule;
  };
  pmKeymap: {
    keymap: typeof keymap;
  };
}

export type PluginFn = (context: PluginContext, options?: any) => PluginInfo | null;
export type EditorPlugin = PluginFn | [PluginFn, any];
type ContextInfo = {
  eventEmitter: Emitter;
  usageStatistics: boolean;
  instance: Editor | Viewer;
};

export type EditorPluginInfo = ContextInfo & {
  plugin: EditorPlugin;
};

export type EditorPluginsInfo = ContextInfo & {
  plugins: EditorPlugin[];
};

export interface EditorOptions {
  el: HTMLElement;
  height?: string;
  minHeight?: string;
  initialValue?: string;
  previewStyle?: PreviewStyle;
  initialEditType?: EditorType;
  events?: EventMap;
  hooks?: HookMap;
  language?: string;
  useCommandShortcut?: boolean;
  usageStatistics?: boolean;
  toolbarItems?: (string | ToolbarItemOptions)[][];
  hideModeSwitch?: boolean;
  plugins?: EditorPlugin[];
  extendedAutolinks?: ExtendedAutolinks;
  placeholder?: string;
  linkAttributes?: LinkAttributes;
  customHTMLRenderer?: CustomHTMLRenderer;
  customMarkdownRenderer?: ToMdConvertorMap;
  referenceDefinition?: boolean;
  customHTMLSanitizer?: Sanitizer;
  previewHighlight?: boolean;
  disallowDeepHeading?: boolean;
  frontMatter?: boolean;
  widgetRules?: WidgetRule[];
  theme?: string;
  autofocus?: boolean;
  viewer?: boolean;
}

interface Slots {
  mdEditor: HTMLElement;
  mdPreview: HTMLElement;
  wwEditor: HTMLElement;
}

export class EditorCore {
  constructor(options: EditorOptions);

  public eventEmitter: Emitter;

  public static factory(options: EditorOptions): EditorCore | Viewer;

  public static setLanguage(code: string, data: Record<string, string>): void;

  changePreviewStyle(style: PreviewStyle): void;

  exec(name: string, payload?: Record<string, any>): void;

  addCommand(type: EditorType, name: string, command: CommandFn): void;

  on(type: string, handler: Handler): void;

  off(type: string): void;

  addHook(type: string, handler: Handler): void;

  removeHook(type: string): void;

  focus(): void;

  blur(): void;

  moveCursorToEnd(focus?: boolean): void;

  moveCursorToStart(focus?: boolean): void;

  setMarkdown(markdown: string, cursorToEnd?: boolean): void;

  setHTML(html: string, cursorToEnd?: boolean): void;

  getMarkdown(): string;

  getHTML(): string;

  insertText(text: string): void;

  setSelection(start: EditorPos, end?: EditorPos): void;

  replaceSelection(text: string, start?: EditorPos, end?: EditorPos): void;

  deleteSelection(start?: EditorPos, end?: EditorPos): void;

  getSelectedText(start?: EditorPos, end?: EditorPos): string;

  getRangeInfoOfNode(pos?: EditorPos): NodeRangeInfo;

  addWidget(node: Node, style: WidgetStyle, pos?: EditorPos): void;

  replaceWithWidget(start: EditorPos, end: EditorPos, text: string): void;

  setHeight(height: string): void;

  getHeight(): string;

  setMinHeight(minHeight: string): void;

  getMinHeight(): string;

  isMarkdownMode(): boolean;

  isWysiwygMode(): boolean;

  isViewer(): boolean;

  getCurrentPreviewStyle(): PreviewStyle;

  changeMode(mode: EditorType, isWithoutFocus?: boolean): void;

  destroy(): void;

  hide(): void;

  show(): void;

  setScrollTop(value: number): void;

  getScrollTop(): number;

  reset(): void;

  getSelection(): SelectionPos;

  setPlaceholder(placeholder: string): void;

  getEditorElements(): Slots;

  convertPosToMatchEditorMode(start: EditorPos, end?: EditorPos, mode?: EditorType): EditorPos[];
}

export class Editor extends EditorCore {
  insertToolbarItem({ groupIndex, itemIndex }: IndexList, item: string | ToolbarItemOptions): void;

  removeToolbarItem(itemName: string): void;
}

export type SelectionPos = Sourcepos | [from: number, to: number];
export type EditorPos = MdPos | number;
export interface NodeRangeInfo {
  range: SelectionPos;
  type: string;
}

export interface Base {
  el: HTMLElement;

  editorType: EditorType;

  eventEmitter: Emitter;

  context: Context;

  schema: Schema;

  keymaps: Plugin[];

  view: EditorView;

  commands: EditorAllCommandMap;

  specs: SpecManager;

  placeholder: { text: string };

  createSpecs(): SpecManager;

  createContext(): Context;

  createState(): EditorState;

  createView(): EditorView;

  createSchema(): Schema;

  createKeymaps(useCommandShortcut: boolean): Plugin<any, any>[];

  createCommands(): Record<string, EditorCommandFn<Record<string, any>>>;

  focus(): void;

  blur(): void;

  destroy(): void;

  moveCursorToStart(focus: boolean): void;

  moveCursorToEnd(focus: boolean): void;

  setScrollTop(top: number): void;

  getScrollTop(): number;

  setPlaceholder(text: string): void;

  setHeight(height: number): void;

  setMinHeight(minHeight: number): void;

  getElement(): HTMLElement;

  setSelection(start: EditorPos, end?: EditorPos): void;

  replaceWithWidget(start: EditorPos, end: EditorPos, text: string): void;

  addWidget(node: Node, style: WidgetStyle, pos?: EditorPos): void;

  replaceSelection(text: string, start?: EditorPos, end?: EditorPos): void;

  deleteSelection(start?: EditorPos, end?: EditorPos): void;

  getSelectedText(start?: EditorPos, end?: EditorPos): string;

  getSelection(): SelectionPos;

  getRangeInfoOfNode(pos?: EditorPos): NodeRangeInfo;
}

export type SchemaMap = Record<string, NodeSpec | MarkSpec>;
export interface HTMLSchemaMap {
  nodes: SchemaMap;
  marks: SchemaMap;
}
