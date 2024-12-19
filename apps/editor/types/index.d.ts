// Type definitions for TOAST UI Editor v3.2.2
// TypeScript Version: 4.2.3
import {
  EditorCore,
  Editor,
  Viewer,
  EditorOptions,
  ViewerOptions,
  ExtendedAutolinks,
  LinkAttributes,
  Sanitizer,
  EditorType,
  PreviewStyle,
  EventMap,
  HookMap,
  WidgetStyle,
  WidgetRuleMap,
  WidgetRule,
  PluginContext,
  I18n,
  CustomHTMLRenderer,
  HTMLMdNodeConvertor,
  HTMLMdNodeConvertorMap,
} from './editor';
import './toastui-editor-viewer';

export {
  MdNode,
  MdNodeType,
  ListMdNode,
  ListItemMdNode,
  TableMdNode,
  TableCellMdNode,
  CodeBlockMdNode,
  LinkMdNode,
  ListData,
  HeadingMdNode,
  CodeMdNode,
  HTMLConvertorMap,
} from './toastmark';
export { ToMdConvertorMap } from './convertor';
export { Emitter, Handler } from './event';
export {
  EditorOptions,
  ViewerOptions,
  ExtendedAutolinks,
  LinkAttributes,
  Sanitizer,
  EditorType,
  PreviewStyle,
  EventMap,
  HookMap,
  WidgetStyle,
  WidgetRuleMap,
  WidgetRule,
  PluginContext,
  I18n,
  CustomHTMLRenderer,
  HTMLMdNodeConvertor,
  HTMLMdNodeConvertorMap,
};
export { Dispatch } from './spec';
export { PluginInfo, PluginNodeViews, CommandFn, PluginCommandMap } from './plugin';
export { MdLikeNode, HTMLMdNode } from './markdown';
export { Editor, EditorCore, Viewer };
export default Editor;

export declare namespace toastui {
  export { Editor };
}
