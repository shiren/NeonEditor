# 🔩 Custom Block Node And HTML Node

The TOAST UI Editor (henceforth referred to as 'Editor') follows the [CommonMark](https://spec.commonmark.org/0.31.2/) specification, and also supports the [GFM](https://github.github.com/gfm/) specification. But what if you want to use a specific syntax that is not supported by CommonMark or GFM? For example, you might want to use [LaTeX](https://www.latex-project.org/) syntax or render elements such as charts in Markdown. The editor provides the option to define a **custom block node** for this usability.

## Custom Block Node

The editor provides the `customHTMLRenderer` option that can be customized when converting Markdown Abstract Syntax Tree(AST) to HTML text. Using `customHTMLRenderer` option, rendering results of nodes supported by CommonMark or GFM can be customized like `table` and `heading`. Custom block nodes can also be defined using this `customHTMLRenderer` option.

The following code defines a custom block node that renders math typesetting using KaTeX, a library that supports LaTex syntax.

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

The `latex` function property was written in the `customHTMLRenderer` option, which returns HTML to be rendered in token format. It is easy to use because it configures options in almost the same form as when customizing a markdown node. The code above is rendered in the Markdown Editor as follows.

![image](https://user-images.githubusercontent.com/37766175/120983159-65bf2b00-c7b4-11eb-84af-30c38e832585.png)

As you can see in the image above, in order to use a custom block node in a markdown editor, text must be entered within a block enclosed by the `$$` symbol. Blocks wrapped with `$$` symbols are parsed from editor to custom block nodes. In addition, to indicate which custom block node it is, the node name defined by the `customHTMLRenderer` option must be written next to the `$$` symbol.

```js
// The node name must be written next to the $$ symbol.
$$latex
\documentclass{article}
\begin{document}

$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \, d\xi
$
\end{document}
$$
```

### WYSIWYG

The custom block node in the WYSIWYG Editor works like the image below.

![image](https://user-images.githubusercontent.com/37766175/120984395-96539480-c7b5-11eb-8e57-2f43082f345f.gif)

In WYSIWYG Editor, the custom block node is rendered in the same result as a markdown preview, and can be changed by clicking on the node and using the edit button that appears when selected. Because the custom block node are eventually parsed based on specific text, editing in the WYSIWYG Editor is also based on text. This operation is different from general WYSIWYG editors, but it is more ideal because the **TOAST UI Editor supports WYSIWYG editors based on markdown**.

## HTML Node

CommonMark uses `<` and `>` characters to write nodes that are not supported by default in HTML text.
([CommonMark Raw HTML Spec](https://spec.commonmark.org/0.31.2/#raw-html))

Because Markdown Editor also follows these specifications, HTML text are rendered correctly in the Markdown preview.

![image](https://user-images.githubusercontent.com/37766175/120987131-44f8d480-c7b8-11eb-971f-0b4ecb59e112.png)

### WYSIWYG
Unfortunately, WYSIWYG Editor cannot render HTML nodes properly. The editor internally manages nodes supported by the WYSIWYG Editor as abstracted model object. Nodes that are supported by WYSIWYG Editor are nodes that are supported by CommonMark and GFM (such as `heading`, `list`, `strike` and others) and custom block node.

![image](https://user-images.githubusercontent.com/37766175/120989247-4c20e200-c7ba-11eb-8420-7ff5726592cf.gif)

The `iframe` node in the example image above is not a node supported by WYSIWYG Editor. Therefore, if you want to use `iframe` node in WYSIWYG Editor, you need to set it up using `customHTMLRenderer` option.

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

HTML nodes are defined in the `customHTMLRenderer.htmlBlock` property. To distinguish it from the custom block nodes described above, it should be configured within the `htmlBlock` property. If you run the example code, `iframe` node will be rendered correctly in WYSIWYG as shown in the image below.

![image](https://user-images.githubusercontent.com/37766175/120989209-40352000-c7ba-11eb-9112-047a0af4f9d6.gif)

If you want to use an inline HTML node, it should be configured in the `customHTMLRenderer.htmlInline` property.

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