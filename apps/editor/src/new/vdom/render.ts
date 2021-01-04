import isFunction from 'tui-code-snippet/type/isFunction';
import { Component, ComponentClass } from '@t/ui';
import { VNode } from './vnode';
import { createNode } from './dom';

const componentMap: Record<string, Component> = {};

export function createComponent(Comp: ComponentClass, props: Record<string, any>) {
  let cached = componentMap[Comp.componentName];

  if (cached) {
    cached.props = props;
    return cached;
  }

  cached = componentMap[Comp.componentName] = new Comp(props);
  cached.mounting = true;

  return cached;
}

export function buildVNode(vnode: VNode | null) {
  while (vnode) {
    if (isFunction(vnode.type)) {
      const instance = createComponent(vnode.type, vnode.props);

      vnode.children = [instance.render()];
      buildChildrenVNode(vnode);
    } else {
      if (!vnode.node) {
        vnode.node = createNode(vnode);
      }
      buildChildrenVNode(vnode);
    }

    if (vnode.firstChild) {
      vnode = vnode.firstChild;
    } else {
      while (vnode && vnode.parent && !vnode.next) {
        vnode = vnode.parent!;
      }
      vnode = vnode.next;
    }
  }
}

function isSameType(old: VNode | null, vnode: VNode) {
  return old && vnode && vnode.type === old.type;
}

function buildChildrenVNode(parent: VNode) {
  const { children } = parent;
  let old = parent.old ? parent.old.firstChild : null;
  let prev: VNode | null = null;

  children.forEach((vnode, index) => {
    const sameType = isSameType(old, vnode);

    if (sameType) {
      vnode.old = old!;
      vnode.parent = parent;
      vnode.node = old!.node;
    }

    if (vnode && !sameType) {
      vnode.parent = parent;
    }

    if (old && !sameType) {
      VNode.removalNodes.push(old);
    }

    if (old) {
      old = old.next;
    }

    if (index === 0) {
      parent.firstChild = vnode;
    } else if (vnode) {
      prev!.next = vnode;
    }

    prev = vnode;
  });
}