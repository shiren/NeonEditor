# 🔩 커스텀 블록 노드와 HTML 노드

TOAST UI Editor(이하 '에디터'라고 명시)는 [CommonMark](https://spec.commonmark.org/0.31.2/) 스펙을 준수하며, 추가로 [GFM](https://github.github.com/gfm/) 스펙도 지원한다. 하지만 만약 CommonMark나 GFM에서 지원하지 않는 특정 문법을 사용하고 싶다면 어떨까? 예를 들어 마크다운에서 [LaTeX](https://www.latex-project.org/) 문법을 사용하거나 차트 같은 요소를 렌더링하고 싶을 수 있다. 에디터에서는 이러한 사용성을 위해 사용자만의 **커스텀 블록 노드**를 정의할 수 있는 옵션을 제공한다.

## 커스텀 블록 노드

에디터는 마크다운 AST(Abstract Syntax Tree)를 HTML 문자열로 변환할 때 커스터마이징할 수 있는 `customHTMLRenderer` 옵션을 제공한다. `customHTMLRenderer` 옵션을 사용하면 `table`, `heading`처럼 CommonMark나 GFM에서 지원하는 노드의 렌더링 결과를 커스터마이징할 수 있다. 커스텀 블록 노드 역시 이 `customHTMLRenderer` 옵션을 사용하여 정의할 수 있다.

다음 코드는 LaTex 문법을 지원하는 라이브러리인 KaTeX를 사용하여 수식을 렌더링하는 커스텀 블록 노드를 정의한 것이다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    latex(node) {
      const generator = new latexjs.HtmlGenerator({ hyphenate: false });
      const { body } = latexjs.parse(node.literal, { generator }).htmlDocument();

      return [
        { type: 'openTag', tagName: 'div', outerNewLine: true },
        { type: 'html', content: body.innerHTML },
        { type: 'closeTag', tagName: 'div', outerNewLine: true }
      ];
    },
  }
});
```

`customHTMLRenderer` 옵션에 `latex` 함수 프로퍼티를 작성하였고 이 함수에서는 렌더링 될 HTML을 토큰 형태로 반환한다. 마크다운 노드를 커스터마이징을 할 때와 거의 동일한 형태로 옵션을 지정하기 때문에 쉽게 사용할 수 있다. 위의 코드는 마크다운 에디터에서 다음처럼 렌더링된다.

![image](https://user-images.githubusercontent.com/37766175/120983159-65bf2b00-c7b4-11eb-84af-30c38e832585.png)

위의 이미지에서 볼 수 있듯이 마크다운 에디터에서 커스텀 블록 노드를 사용하기 위해서는 `$$` 기호로 감싸진 블록 내에 텍스트를 입력해야 한다. `$$` 기호로 감싸진 블록은 에디터에서 커스텀 블록 노드로 파싱된다. 또한 어떠한 커스텀 블록 노드인지 나타내기 위해 `$$` 기호 다음에 반드시 `customHTMLRenderer` 옵션에서 정의한 노드 이름을 작성해야 한다.

```js
// $$ 기호 뒤에 옵션에서 정의한 노드 이름을 반드시 명시해야 한다.
$$latex
\documentclass{article}
\begin{document}

$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \, d\xi
$
\end{document}
$$
```

### 위지윅
정의된 커스텀 블록 노드는 위지윅 에디터에서 아래 이미지처럼 동작한다.

![image](https://user-images.githubusercontent.com/37766175/120984395-96539480-c7b5-11eb-8e57-2f43082f345f.gif)

위지윅 에디터에서 커스텀 블록 노드는 마크다운 프리뷰와 동일한 모습으로 렌더링되며, 노드를 클릭하여 선택했을 때 나오는 편집 버튼을 통해 내용을 변경할 수 있다. 커스텀 블록 노드도 결국 특정 텍스트를 기준으로 파싱되는 것이기 때문에 위지윅 에디터에서의 편집도 텍스트를 기준으로 한다. 이는 일반적인 위지윅 에디터와는 다른 동작이지만 **TOAST UI Editor는 마크다운을 기반으로 위지윅 에디터를 지원**하기 때문에 이러한 동작이 더 이상적이다.

## HTML 노드

CommonMark에서는 `<`과 `>` 문자를 사용하여 기본적으로 지원하지 않는 노드를 HTML 문자열 형태로 작성할 수 있다.
([CommonMark Raw HTML Spec 참조](https://spec.commonmark.org/0.31.2/#raw-html))

에디터의 마크다운 에디터에서도 이러한 스펙을 준수하기 때문에 HTML 문자열은 마크다운 프리뷰에서 올바르게 렌더링 된다.

![image](https://user-images.githubusercontent.com/37766175/120987131-44f8d480-c7b8-11eb-971f-0b4ecb59e112.png)

### 위지윅
하지만 안타깝게도 위지윅 에디터에서는 HTML 노드를 제대로 렌더링할 수 없다. 에디터는 내부적으로 위지윅 에디터에서 기본으로 지원하는 노드를 추상화된 모델 객체로 관리하고 있다. 위지윅 에디터에서 지원하는 노드란 CommonMark와 GFM 에서 지원하는 노드(`heading`, `list`, `strike` 등)와 커스텀 블록 노드를 의미한다.

![image](https://user-images.githubusercontent.com/37766175/120989247-4c20e200-c7ba-11eb-8420-7ff5726592cf.gif)

위 예시 이미지의 `iframe` 노드는 위지윅 에디터에서 기본적으로 지원하는 노드가 아니다. 그렇기 때문에 `iframe` 노드를 위지윅 에디터에서도 사용하고 싶다면 `customHTMLRenderer` 옵션을 사용하여 추가 설정을 해야 한다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    htmlBlock: {
      iframe(node) {
        return [
          { type: 'openTag', tagName: 'iframe', outerNewLine: true, attributes: node.attrs },
          { type: 'html', content: node.childrenHTML },
          { type: 'closeTag', tagName: 'iframe', outerNewLine: true },
        ];
      },
    }
  },
});
```

HTML 노드는 `customHTMLRenderer.htmlBlock` 프로퍼티에 정의한다. 위에서 설명한 커스텀 블록 노드와 구분하기 위해 `htmlBlock` 프로퍼티 내에서 추가할 HTML 노드의 컨버팅 함수를 정의한다. 예제 코드를 실행하면 아래 이미지처럼 위지윅에서도 `iframe` 노드가 올바르게 렌더링된다.

![image](https://user-images.githubusercontent.com/37766175/120989209-40352000-c7ba-11eb-9112-047a0af4f9d6.gif)

만약 인라인 HTML 노드를 사용하고 싶다면, `customHTMLRenderer.htmlInline` 프로퍼티에 정의한다.

```js
const editor = new Editor({
  el: document.querySelector('#editor'),
  customHTMLRenderer: {
    htmlBlock: {
      iframe(node) {
        return [
          { type: 'openTag', tagName: 'iframe', outerNewLine: true, attributes: node.attrs },
          { type: 'html', content: node.childrenHTML },
          { type: 'closeTag', tagName: 'iframe', outerNewLine: true },
        ];
      },
    },
    htmlInline: {
      big(node, { entering }) {
        return entering
          ? { type: 'openTag', tagName: 'big', attributes: node.attrs }
          : { type: 'closeTag', tagName: 'big' };
      },
    },
  },
});
```