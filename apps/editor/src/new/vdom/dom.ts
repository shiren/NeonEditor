import { VNode } from './vnode';

type ConditionFn = (propName: string) => boolean;
type Props = Record<string, any>;

export function createNode(vnode: VNode) {
  let node: Node;

  if (vnode.type === 'TEXT_NODE') {
    node = document.createTextNode(vnode.props.nodeValue);
  } else {
    node = document.createElement(vnode.type as string);
    setProps(node, vnode.props);
  }

  return node;
}

export function removeNode(vnode: VNode, parentNode: Node) {
  if (vnode.node) {
    parentNode.removeChild(vnode.node);
  } else {
    removeNode(vnode.firstChild!, parentNode);
  }
}

export function innerDiff(node: Node, prevProps: Props, nextProps: Props) {
  Object.keys(prevProps).forEach(propName => {
    if (/^on/.test(propName)) {
      if (!nextProps[propName] || prevProps[propName] !== nextProps[propName]) {
        const eventName = propName.slice(2).toLowerCase();

        node.removeEventListener(eventName, prevProps[propName]);
      }
    } else if (!nextProps[propName]) {
      (node as Element).removeAttribute(propName);
    }
  });

  setProps(node, nextProps, propName => prevProps[propName] !== nextProps[propName]);
}

function setProps(node: Node, props: Props, contition?: ConditionFn) {
  Object.keys(props).forEach(propName => {
    if (!contition || contition(propName)) {
      if (/^on/.test(propName)) {
        const eventName = propName.slice(2).toLowerCase();

        node.addEventListener(eventName, props[propName]);
      } else {
        (node as Element).setAttribute(propName, props[propName]);
      }
    }
  });
}