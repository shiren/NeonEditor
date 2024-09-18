# ToastMark

ToastMark is a markdown parser extended from [commonmark.js](https://github.com/commonmark/commonmark.js), with more advanced features to be used within TOAST UI Editor. 

> Currently, ToastMark is for interal usage only as the API's are supposed to be changed frequently. We are planning to register this as a separate npm package when API's are stabilized.

## Differences from commonmark.js

### GitHub Flavored Markdown(GFM) Support
commonmark.js is the reference implementation of [CommonMark](https://spec.commonmark.org/0.31.2/) and doesn't support [GFM](https://github.github.com/gfm/), which is extended markdown syntax based on CommonMark. ToastMark has its own implementation for supporting GFM.

### Source Position Information
Although commonmark.js provides source position information related with each node in AST(Abstract Syntax Tree), those are limited to block-level elements. ToastMark extended this feature to provide source position information for inline-level elements also.

### Incremental Parsing
As ToastMark is developed for the purpose of improving markdown editing experience, this must be the key feature of ToastMark. Instead of parsing the entire document whenever a user makes a change to a document, ToastMark parses only changed part of the document and update the existing AST. It also returns information about removed and inserted nodes, which can be used to update syntax highlithing or preview contents incrementally.

### Searching and Editing AST
ToastMark provides useful methods to search the existing AST, such as `findNodeAtPosition` and `findNodeById`. These methods can be used for synchronizing scroll position of markdown editor and preview contents, updating the style of the toolbar buttons correspond to the cursor position, and so on. We are also planning to add more methods to edit existing AST to support commands like `Bold`, `Italic`, and `OrderedList` which can be triggered by toolbar buttons and keyboard shortcuts.

### TypeScript
The entire codebase is converted from JavaScript to TypeScript. 
