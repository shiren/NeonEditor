# 🎨 Custom HTML Renderer

TOAST UI Editor(이하 '에디터'라고 명시)는 마크다운 텍스트를 HTML 문자열로 변환하기 위해 `ToastMark`라는 자체 마크 다운 파서를 사용한다. `ToastMark`는 두 단계로 마크다운 텍스트를 변환한다.

1. 마크다운 텍스트를 AST(Abstract Syntax Tree)로 변환한다.
2. 변환된 AST를 순회하며 HTML 문자열을 생성한다.

첫 번째 단계에서 AST를 생성할 때 커스터마이징 옵션이나 API를 제공하는 것은 파싱 과정 자체를 사용자가 이해해야 하므로 어려운 일이 될 것이다. 하지만 완성된 AST를 사용하여 HTML 문자열로 변환할 때에는 HTML 토큰화에 대해서만 이해하면 되기 때문에 사용자가 커스터마이징하기 어렵지 않다. 

그렇기 때문에 에디터에서는 두 번째 단계(AST를 사용하여 HTML 문자열로 변환)에서 커스터마이징할 수 있는 옵션을 사용자에게 제공한다. 이 옵션은 마크다운 프리뷰뿐만 아니라 마크다운에서 위지윅 에디터로 컨버팅할 때에도 적용이 된다. 다만 아래처럼 내부적인 컨버팅 로직은 다르게 동작한다.

* 마크다운 프리뷰: 커스터마이징 옵션에 정의한 **HTML 토큰은 마크다운 HTML 문자열을 생성할 때 사용된다**.
* 마크다운 → 위지윅 컨버팅: 커스터마이징 옵션에 정의한 **HTML 토큰은 위지윅의 노드로 변환될 때 사용된다**. 이 때 위지윅 노드는 DOM 노드가 아닌 에디터 내부적으로 관리하는 추상화된 모델 객체이다.

## 기본 사용 방법

에디터에서는 `customHTMLRenderer` 옵션으로 HTML 문자열 변환 과정을 커스터마이징할 수 있다. 이 옵션은 key-value 형태의 객체이며, 객체의 키는 AST의 노드 타입, 값은 AST 노드를 HTML 토큰으로 변환하여 반환하는 함수이다.

다음 코드는 `customHTMLRenderer` 옵션을 사용하는 기본 예시이다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    heading(node, context) {
      return {
        type: context.entering ? 'openTag' : 'closeTag',
        tagName: 'div',
        classNames: [`heading-'${node.level}`]
      }
    },
    text(node, context) {
      const strongContent = node.parent.type === 'strong';
      return {
        type: 'text',
        content: strongContent ? node.literal.toUpperCase() : node.literal
      }
    },
    linebreak(node, context) {
      return {
        type: 'html',
        content: '\n<br />\n'
      }
    }
  }
});
```

만약 마크다운 텍스트가 아래와 같다면,

```markdown
## Heading
Hello
World
```

다음과 같이 변환된다.

```html
<div class="heading2">HEADING</div>
<p>Hello<br><br>World</p>
```

## HTML 토큰
 
위의 기본 예시에서 볼 수 있듯이 각 함수는 HTML 문자열을 직접 반환하는 것이 아니라 **토큰 객체**를 반환한다. 토큰 객체는 `ToastMark` 내부 모듈에 의해 HTML 문자열로 자동 변환된다. HTML 텍스트 대신 토큰을 사용하는 이유는 구조적인 정보를 담아 기본 동작을 재정의하고 재사용할 수 있기 때문이다.

토큰 객체에 사용할 수 있는 타입은 `openTag`, `closeTag`, `text`, `html` 4가지가 있다.

### openTag

`openTag` 토큰은 열린 태그 문자열을 나타낸다. `openTag` 토큰은 HTML 문자열을 생성하기 위해 `tagName`, `attributes`, `classNames` 프로퍼티를 가지고 있다. 

다음 코드처럼 `openTag` 객체 옵션을 지정한다면,

```js
{
  type: 'openTag',
  tagName: 'a',
  classNames: ['my-class1', 'my-class2']
  attributes: {
    target: '_blank',
    href: 'http://ui.toast.com'
  }
}
```

아래와 같은 HTML 문자열로 변환된다.

```html
<a class="my-class1 my-class2" href="http://ui.toast.com" target="_blank">
```

만약 `<br />`과 `<hr />`처럼 자체적으로 닫기 태그를 지정하고 싶다면, `selfClose` 옵션을 사용하면 된다.

```js
{
  type: 'openTag',
  tagName: 'br',
  classNames: ['my-class'],
  selfClose: true
}
```

```html
<br class="my-class" />
```

### closeTag

`closeTag` 토큰은 닫는 태그 문자열을 나타낸다. `closeTag` 토큰에서는 `tagName` 프로퍼티만 지정하면 된다.

```js
{
  type: 'closeTag',
  tagName: 'a'
}
```

```html
</a>
```

### text

`text` 토큰은 일반 텍스트 문자열을 나타낸다. 이 토큰에는 `content` 프로퍼티만 존재하며 이 값은 이스케이프 처리되어 HTML 텍스트로 사용된다.

```js
{
  type: 'text',
  content: '<br />'
}
```

```html
&lt;br /&gt;
```

### html

`html` 토큰은 HTML 문자열을 의미한다. `text` 토큰과 마찬가지로 `content` 프로퍼티만 가지지만, 이스케이프 처리 없이 그대로 사용된다. DOM의 `innerHTML` API와 거의 동일한 역할을 한다고 이해하면 된다.

```js
{
  type: 'html',
  content: '<br />'
}
```

```html
<br />
```

## Node

옵션으로 지정한 컨버팅 함수의 첫 번째 매개변수는 `Node` 객체이다. 이 객체는 `ToastMark`에 의해 생성된 AST(Abstract Syntax Tree)의 주요 구성 요소이다. 모든 노드는 `parent`, `firstChild`, `lastChild`, `prev`, `next` 등 트리를 구성하기 위한 공통의 속성을 가지고 있다.

또한 각 노드는 타입에 따른 고유한 프로퍼티가 있다. 예를 들어 `heading` 노드는 헤딩 요소의 레벨을 나타내는 `level` 프로퍼티가 있고, `link` 노드에는 링크 URL을 나타내는 `destination` 프로퍼티가 있다.

아래 예시를 보면 마크다운 텍스트가 AST로 변환되었을 때 어떠한 구조인지 파악할 수 있다.

```md
## TOAST UI
**Hello** World!
```

```js
{
  type: 'document',
  firstChild: {
    type: 'heading',
    level: 2,
    parent: //[document node],
    firstChild:
      type: 'text',
      parent: //[heading node],
      literal: 'TOAST UI'
    },
    next: {
      type: 'paragraph',
      parent: //[document node],
      firstChild: {
        type: 'strong',
        parent: //[paragraph node],
        firstChild: {
          type: 'text',
          parent: //[strong node],
          literal: 'Hello'
        },
        next: {
          type: 'text',
          parent: //[paragraph node],
          literal: 'World !'
        }
      }
    }
  }
}
```

AST를 구성하는 각 노드의 타입은 [이 코드](https://github.com/nhn/tui.editor/blob/master/libs/toastmark/src/commonmark/node.ts)에서 확인할 수 있다.

## Context

에디터가 AST를 사용하여 HTML 문자열을 생성할 때에는 전위순회 방식으로 모든 노드를 탐색한다. 노드를 방문할 때마다 노드의 타입과 동일한 키 값을 가진 컨버팅 함수가 호출되며, `context` 객체는 컨버팅 함수의 두 번째 매개변수로 주어진다.

### entering

에디터에서 [이 함수](https://github.com/nhn/tui.editor/blob/master/libs/toastmark/src/commonmark/node.ts#L38)에 정의된 노드 타입들은 AST의 순회 중 두 번씩 방문한다. 첫 번째는 해당 노드로 순회를 시작할 때 방문하며, 두 번째는 모든 자식 노드들을 순회한 후 방문한다. `context` 객체의 `entering` 프로퍼티를 사용하여 컨버팅 함수가 호출되는 시점을 알 수 있다.

다음 코드는 `entering` 프로퍼티를 사용하는 예시이다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    heading({ level }, { entering }) {
      return {
        type: entering ? 'openTag' : 'closeTag',
        tagName: `h${level}`,
      }
    },
    text({ literal }) {
      return {
        type: 'text',
        content: node.literal
      }
    }
  }
});
```

`heading` 노드의 컨버팅 함수는 `context.entering` 프로퍼티를 사용하여 반환할 토큰 객체의 타입을 결정한다. 값이 `true`일 때 `openTag`을 반환하여, 그렇지 않으면 `closeTag`를 반환한다. `text` 컨버팅 함수는 리프 노드이기 때문에 한 번만 호출되므로 `entering` 속성을 사용할 필요가 없다.

만약 다음 마크다운 텍스트를 에디터에 입력했을 때,

```markdown
# TOAST UI
```

`ToastMark`가 생성한 AST는 아래와 같다. (편의상 필수 프로퍼티만 간략하게 나타내었다.)

```js
{
  type: 'document',
  firstChild: {
    type: 'heading',
    level: 1,
    firstChild: {
      type: 'text',
      literal: 'TOAST UI'
    }
  }
}
```

AST 순회를 모두 마치면 지정한 컨버팅 함수의 결과로 반환된 토큰들이 아래와 같은 배열 형태로 저장된다.

```js
[
  { type: 'openTag', tagName: 'h1' },
  { type: 'text', content: 'TOAST UI' },
  { type: 'closeTag', tagName: 'h1' }
]
```

최종적으로 에디터 내부에서 토큰 배열을 사용하여 HTML 문자열로 생성한다.

```html
<h1>TOAST UI</h1>
```

### origin()

만약 `customHTMLRenderer`로 지정한 함수 안에서 원래 기존의 컨버팅 함수를 사용하고 싶다면, `origin()` 함수를 호출하여 사용할 수 있다.

예를 들어 `link` 노드에 대해 아래와 같은 HTML 토큰을 반환하는 기존의 컨버팅 함수가 있다고 가정해보자.

#### `entering: true`인 경우
```js
{
  type: 'openTag',
  tagName: 'a',
  attributes: {
    href: 'http://ui.toast.com',
    title: 'TOAST UI'
  }
}
```
#### `entering: false`인 경우
```js
{
  type: 'closeTag',
  tagName: 'a'
}
```

이 경우 직접 정의한 컨버팅 함수에서 `origin()` 함수를 호출하여 기존에 정의된 컨버팅 함수를 실행할 수 있다. 아래 코드는 `origin()`(기존 컨버팅 함수)을 호출하여 반환된 HTML 토큰에 `target="_blank"` 속성을 추가적으로 설정한 것이다.


```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    link(node, context) {
      const { origin, entering } = context;
      const result = origin();
      if (entering) {
        result.attributes.target = '_blank';
      }
      return result;
    }
  },
}
```

#### `entering: true`인 경우
```js
{
  type: 'openTag',
  tagName: 'a',
  attributes: {
    href: 'http://ui.toast.com',
    target: '_blank',
    title: 'TOAST UI'  
  }
}
```

## 심화 사용 방법

### getChildrenText()

대부분의 경우 노드의 컨버팅 함수에서 자식 노드의 텍스트가 필요하진 않을 것이다. 하지만 종종 자식 노드의 텍스트를 가져와 속성을 설정해야 하는 경우가 있다. 이러한 경우 `context` 객체의 `getChildrenText()` 함수를 사용하면 유용하다.

예를 들어 헤딩 요소에 자식 콘텐츠를 기준으로 `id`를 설정하고 싶다면 아래 코드처럼 `getChildrenText()` 함수를 사용할 수 있다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    heading(node, { entering, getChildrenText }) {
      const tagName = `h${node.level}`;
      
      if (entering) {
        return {
          type: 'openTag',
          tagName,
          attributes: { 
            id: getChildrenText(node).trim().replace(/\s+/g, '-')
          }        
        }
      }
      return { type: 'closeTag', tagName };
    }
  }
});
```

다음과 같은 마크다운 텍스트가 있다면,

```markdown
# Hello *World*
```

`heading` 컨버팅 함수에서 `getChildrenText()` 함수의 반환 값은 `Hello World` 문자열이 된다. 컨버팅 함수에서는 공백 문자를 `-` 문자로 치환했기 때문에 최종 HTML 문자열은 아래와 같다.

```html
<h1 id="Hello-World">Hello <em>World</em></h1>
```

### skipChildren()

`skipChildren()` 함수를 호출하면 자식 노드의 순회를 건너뛴다. 자식 노드의 콘텐츠를 변환하지 않고 현재 노드의 속성만 사용하여 콘텐츠로 사용하고 싶을 때 유용하다.

예를 들어 `image` 노드에는 이미지의 설명을 나타내는 자식 노드가 존재한다. 그러나 `image` 노드를 HTML로 표현하는 `img` 요소는 자식 요소를 가질 수 없다. 그렇기 때문에 `image` 노드의 자식 노드가 불필요한 HTML 문자열로 변환되지 않도록 `skipChildren()` 함수를 호출해야 한다. 만약 자식 노드의 콘텐츠가 필요하다면 앞서 보았던 `getChildrenText()`를 호출하여 사용할 수 있다. 이러한 자식 노드의 콘텐츠는 `img` 요소의 `alt` 속성으로 설정할 수 있다.

다음 코드는 에디터에 내장된 `image` 노드 컨버터 함수의 예시이다.

```js
function image(node, context) {
  const { destination } = node;
  const { getChildrenText, skipChildren } = context;

  skipChildren();

  return {
    type: 'openTag',
    tagName: 'img',
    selfClose: true,
    attributes: {
      src: destination,
      alt: getChildrenText(),
    }
  }
}
```

### 다중 태그 사용

컨버팅 함수에서는 배열 형태의 토큰을 반환할 수 있다. 이것은 노드를 중첩된 HTML 구조로 변환하려는 경우에 유용하다. 다음 코드는 `codeBlock` 노드를 `<pre><code>...</code></pre>` 태그 문자열로 변환하는 예시이다.

```js
function codeBlock(node) {
  return [
    { type: 'openTag', tagName: 'pre', classNames: ['code-block'] },
    { type: 'openTag', tagName: 'code' },
    { type: 'text', content: node.literal },
    { type: 'closeTag', tagName: 'code' },
    { type: 'closeTag', tagName: 'pre' }
  ];
}
```

### 개행 추가

일반적인 경우 최종적으로 변환된 HTML 문자열의 포맷에 신경 쓸 필요가 없다. 그러나 `ToastMark`는 [CommonMark Spec](https://spec.commonmark.org/0.31.2/)을 준수하기 때문에 개행을 제어하는 옵션을 지원해야만 한다.([공식 테스트 데이터](https://spec.commonmark.org/0.31.2/spec.json))

컨버팅 함수의 토큰 객체에 `outerNewline`과 `innerNewline` 프로퍼티를 추가하여 개행을 제어할 수 있다.

#### 토큰 배열
```js
[
  {
    type: 'text',
    content: 'Hello'
  },
  { 
    type: 'openTag',
    tagName: 'p',
    outerNewLine: true,
    innerNewLine: true
  },
  {
    type: 'html',
    content: '<strong>My</strong>',
    outerNewLine: true,
  },
  {
    type: 'closeTag',
    tagName: 'p',
    innerNewLine: true
  },
  {
    type: 'text',
    content: 'World'
  }
]
```

#### 변환된 HTML 문자열
```html
Hello
<p>
<strong>My</strong>
</p>World
```

위의 예시에서 볼 수 있듯이 `openTag`의 `outerNewLine` 프로퍼티는 여는 태그 문자열 시작 전에 `\n` 문자를 추가한다. 만약 `closeTag`에 `outerNewLine` 프로퍼티가 있다면 닫는 태그 문자열 이후에 `\n` 문자를 추가한다. 이와 반대로, `openTag`의 `innerNewLine` 프로퍼티는 여는 태그 문자열 이후에 `\n` 문자를 추가한다. 만약 `closeTag`에 `innerNewLine` 프로퍼티가 있다면 닫는 태그 문자열 시작 전에 `\n` 문자를 추가한다.

연속된 개행이 있는 경우 중복을 막기 위해 하나의 개행으로 병합된다.
