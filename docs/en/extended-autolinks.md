# 🔗 Extending Autolinks

## What Is Autolinks?

### Autolinks

The [Autolinks](https://spec.commonmark.org/0.31.2/#autolinks) is the CommonMark specification like as below. (If you want to know the detail specification of the Autolinks, refer to examples in the above link.)
> Autolinks are absolute URIs and email addresses inside `<` and `>`. They are parsed as `>` links, with the URL or email address as the link label.

The functionality is available in TOAST UI Editor (henceforth referred to as 'Editor') without any configuration, because the Editor follows the CommonMark specification. 

![image](https://user-images.githubusercontent.com/37766175/120604939-7ad04d00-c488-11eb-82c1-f9f05891039e.png)

### Extended Autolinks

The Extended Autolinks is the specification which is supported by [GFM](https://github.github.com/gfm). The specification makes the Autolinks be recognized in a greater number of conditions. For example, if the text has `www.` with a valid domain, it will be recognized as the Autolinks like as below.

![image](https://user-images.githubusercontent.com/37766175/120605112-a5baa100-c488-11eb-9b72-75eaa9324080.png)

More examples related with the Extended Autolinks can be found [here](https://github.github.com/gfm/#autolinks-extension-).


## Extended Autolinks Configuration
The Extended Autolinks on Editor can be used by configuring the `extendedAutolinks` option. If the `extendedAutolinks` option is not otherwise defined, Editor will automatically configure the `false` value to make the Extended Autolinks be not worked internally.

When we set the `extendedAutolinks` value to explicitly declare it `true` value, the nodes which follow the Extended Autolinks specification can be parsed as the link node on Editor.

```js
const editor = new toastui.Editor({
  // ...
  extendedAutolinks: true
});
```

## Customizing the Extended Autolinks
Editor enables users to define their own Extended Autolinks by providing the callback function option. This option can be useful when you want to support the specific link format.

To customize the Extended Autolinks, `extendedAutolinks` option should be `function`. The following is a simple example snippet for configuring the option.

```js
const reToastuiEditorRepo = /tui\.editor/g;

const editor = new Editor({
  el: document.querySelector('#editor'),
  extendedAutolinks: (content) => {
    const matched = content.match(reToastuiEditorRepo);
    if (matched) {
      return matched.map(m =>
        ({
          text: 'toastui-editor',
          url: 'https://github.com/nhn/tui.editor',
          range: [0, 1]
        })
      );
    }
    return null;
  }
});
```
As the code above demonstrates, the `content` parameter which has the editing content is passed to the `extendedAutolinks` callback function. If the desired link formats are found in the content, the result should be the array, and each element has `text`, `url` and `range` properties for the information of link.

* `text`: The link label
* `url`: The link destination
* `range`: The link range for calculating source position internally

Here is the result of the aforementioned example.

![image](https://user-images.githubusercontent.com/37766175/120606618-55444300-c48a-11eb-8376-859fc6ffcf07.gif)