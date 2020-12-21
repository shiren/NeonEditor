/**
 * @fileoverview Implements EventEmitter
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
import isUndefined from 'tui-code-snippet/type/isUndefined';
import isFalsy from 'tui-code-snippet/type/isFalsy';
import { Emitter, EventTypes, Handler } from '@t/event';
import Map from '@/utils/map';

const eventTypeList: EventTypes[] = [
  'previewBeforeHook',
  'previewRenderAfter',
  'previewNeedsRefresh',
  'addImageBlobHook',
  'setMarkdownAfter',
  'contentChangedFromWysiwyg',
  'changeFromWysiwyg',
  'contentChangedFromMarkdown',
  'changeFromMarkdown',
  'change',
  'changeModeToWysiwyg',
  'changeModeToMarkdown',
  'changeModeBefore',
  'changeMode',
  'changePreviewStyle',
  'changePreviewTabPreview',
  'changePreviewTabWrite',
  'openPopupAddLink',
  'openPopupAddImage',
  'openPopupAddTable',
  'openPopupTableUtils',
  'openHeadingSelect',
  'openPopupCodeBlockLanguages',
  'openPopupCodeBlockEditor',
  'openDropdownToolbar',
  'closePopupCodeBlockLanguages',
  'closePopupCodeBlockEditor',
  'closeAllPopup',
  'command',
  'addCommandBefore',
  'htmlUpdate',
  'markdownUpdate',
  'renderedHtmlUpdated',
  'removeEditor',
  'convertorAfterMarkdownToHtmlConverted',
  'convertorBeforeHtmlToMarkdownConverted',
  'convertorAfterHtmlToMarkdownConverted',
  'stateChange',
  'wysiwygSetValueAfter',
  'wysiwygSetValueBefore',
  'wysiwygGetValueBefore',
  'wysiwygProcessHTMLText',
  'wysiwygRangeChangeAfter',
  'wysiwygKeyEvent',
  'scroll',
  'click',
  'mousedown',
  'mouseover',
  'mouseout',
  'mouseup',
  'contextmenu',
  'keydown',
  'keyup',
  'keyMap',
  'load',
  'focus',
  'blur',
  'paste',
  'pasteBefore',
  'willPaste',
  'copy',
  'copyBefore',
  'copyAfter',
  'cut',
  'cutAfter',
  'drop',
  'show',
  'hide',
  'changeLanguage',
  'cursorActivity',
  'requireScrollSync',
  'requireScrollIntoView',
  'setCodeBlockLanguages'
];

/**
 * Class EventEmitter
 * @ignore
 */
class EventEmitter implements Emitter {
  private events: Map<string, Handler[] | undefined>;

  private eventTypes: Record<string, string>;

  constructor() {
    this.events = new Map();
    this.eventTypes = eventTypeList.reduce((types, type) => {
      return { ...types, type };
    }, {});

    eventTypeList.forEach(eventType => {
      this.addEventType(eventType);
    });
  }

  /**
   * Listen event and bind event handler
   * @param {string} type Event type string
   * @param {function} handler Event handler
   */
  listen(type: string, handler: Handler) {
    const typeInfo = this.getTypeInfo(type);
    const eventHandlers = this.events.get(typeInfo.type) || [];

    if (!this.hasEventType(typeInfo.type)) {
      throw new Error(`There is no event type ${typeInfo.type}`);
    }

    if (typeInfo.namespace) {
      handler.namespace = typeInfo.namespace;
    }

    eventHandlers.push(handler);

    this.events.set(typeInfo.type, eventHandlers);
  }

  /**
   * Emit event
   * @param {string} eventName Event name to emit
   * @returns {Array}
   */
  emit(type: string, ...args: any[]) {
    const typeInfo = this.getTypeInfo(type);
    const eventHandlers = this.events.get(typeInfo.type);
    const results: any[] = [];

    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        const result = handler(...args);

        if (!isUndefined(result)) {
          results.push(result);
        }
      });
    }

    return results;
  }

  /**
   * Emit given event and return result
   * @param {string} eventName Event name to emit
   * @param {any} sourceText Source text to change
   * @returns {string}
   */
  emitReduce(type: string, sourceText: any, ...args: any[]) {
    const eventHandlers = this.events.get(type);

    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        const result = handler(sourceText, ...args);

        if (!isFalsy(result)) {
          sourceText = result;
        }
      });
    }

    return sourceText;
  }

  /**
   * Get event type and namespace
   * @param {string} type Event type name
   * @returns {{type: string, namespace: string}}
   * @private
   */
  private getTypeInfo(type: string) {
    const splited = type.split('.');

    return {
      type: splited[0],
      namespace: splited[1]
    };
  }

  /**
   * Check whether event type exists or not
   * @param {string} type Event type name
   * @returns {boolean}
   * @private
   */
  private hasEventType(type: string) {
    return !isUndefined(this.eventTypes[this.getTypeInfo(type).type]);
  }

  /**
   * Add event type when given event not exists
   * @param {string} type Event type name
   */
  addEventType(type: string) {
    if (this.hasEventType(type)) {
      throw new Error(`There is already have event type ${type}`);
    }

    this.eventTypes[type] = type;
  }

  /**
   * Remove event handler from given event type
   * @param {string} eventType Event type name
   * @param {function} [handler] - registered event handler
   */
  removeEventHandler(eventType: string, handler?: Handler) {
    const { type, namespace } = this.getTypeInfo(eventType);

    if (type && handler) {
      this.removeEventHandlerWithHandler(type, handler);
    } else if (type && !namespace) {
      this.events.delete(type);
    } else if (!type && namespace) {
      this.events.forEach((_, evtType) => {
        this.removeEventHandlerWithTypeInfo(evtType, namespace);
      });
    } else if (type && namespace) {
      this.removeEventHandlerWithTypeInfo(type, namespace);
    }
  }

  /**
   * Remove event handler with event handler
   * @param {string} type - event type name
   * @param {function} handler - event handler
   * @private
   */
  private removeEventHandlerWithHandler(type: string, handler: Handler) {
    const eventHandlers = this.events.get(type);

    if (eventHandlers) {
      const handlerIndex = eventHandlers.indexOf(handler);

      if (eventHandlers.indexOf(handler) >= 0) {
        eventHandlers.splice(handlerIndex, 1);
      }
    }
  }

  /**
   * Remove event handler with event type information
   * @param {string} type Event type name
   * @param {string} namespace Event namespace
   * @private
   */
  private removeEventHandlerWithTypeInfo(type: string, namespace: string) {
    const handlersToSurvive: Handler[] = [];
    const eventHandlers = this.events.get(type);

    if (!eventHandlers) {
      return;
    }

    eventHandlers.map((handler: Handler) => {
      if (handler.namespace !== namespace) {
        handlersToSurvive.push(handler);
      }

      return null;
    });

    this.events.set(type, handlersToSurvive);
  }

  getEvents() {
    return this.events;
  }
}

export default EventEmitter;
