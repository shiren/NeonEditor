import toArray from 'tui-code-snippet/collection/toArray';
import isArray from 'tui-code-snippet/type/isArray';
import isString from 'tui-code-snippet/type/isString';
import isUndefined from 'tui-code-snippet/type/isUndefined';
import hasClass from 'tui-code-snippet/domUtil/hasClass';
import addClass from 'tui-code-snippet/domUtil/addClass';
import removeClass from 'tui-code-snippet/domUtil/removeClass';

export function isPositionInBox(style: CSSStyleDeclaration, offsetX: number, offsetY: number) {
  const rect = {
    left: parseInt(style.left, 10),
    top: parseInt(style.top, 10),
    width: parseInt(style.width, 10),
    height: parseInt(style.height, 10)
  };

  return (
    offsetX >= rect.left &&
    offsetX <= rect.left + rect.width &&
    offsetY >= rect.top &&
    offsetY <= rect.top + rect.height
  );
}

const CLS_PREFIX = 'tui-md-';

export function cls(...names: string[]) {
  return names.map(className => `${CLS_PREFIX}${className}`).join(' ');
}

export function isTextNode(node: Node) {
  return node?.nodeType === Node.TEXT_NODE;
}

export function isElemNode(node: Node) {
  return node && node.nodeType === Node.ELEMENT_NODE;
}

export function findNodes(element: Element, selector: string) {
  const nodeList = toArray(element.querySelectorAll(selector));

  if (nodeList.length) {
    return nodeList;
  }

  return [];
}

export function appendNodes(node: Node, nodesToAppend: Node | Node[]) {
  nodesToAppend = isArray(nodesToAppend) ? toArray(nodesToAppend) : [nodesToAppend];

  nodesToAppend.forEach(nodeToAppend => {
    node.appendChild(nodeToAppend);
  });
}

export function insertBeforeNode(insertedNode: Node, node: Node) {
  if (node.parentNode) {
    node.parentNode.insertBefore(insertedNode, node);
  }
}

export function removeNode(node: Node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

export function unwrapNode(node: Node) {
  const result = [];

  while (node.firstChild) {
    result.push(node.firstChild);

    if (node.parentNode) {
      node.parentNode.insertBefore(node.firstChild, node);
    }
  }

  removeNode(node);

  return result;
}

export function toggleClass(element: Element, className: string, state?: boolean) {
  if (isUndefined(state)) {
    state = !hasClass(element, className);
  }
  const toggleFn = state ? addClass : removeClass;

  toggleFn(element, className);
}

export function createElementWith(contents: string | HTMLElement, target: HTMLElement) {
  const container = document.createElement('div');

  if (isString(contents)) {
    container.innerHTML = contents;
  } else {
    container.appendChild(contents);
  }

  const { firstChild } = container;

  if (target) {
    target.appendChild(firstChild!);
  }

  return firstChild;
}

export function getOuterWidth(el: HTMLElement) {
  const computed = window.getComputedStyle(el);

  return (
    ['margin-left', 'margin-right'].reduce(
      (acc, type) => acc + parseInt(computed.getPropertyValue(type), 10),
      0
    ) + el.offsetWidth
  );
}
