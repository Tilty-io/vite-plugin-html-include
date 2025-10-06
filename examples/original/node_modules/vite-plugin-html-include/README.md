# vite-plugin-html-include

> A Vite plugin to include partial HTML files with variable interpolation and slot support — dead simple and fast.

[![npm](https://img.shields.io/npm/v/vite-plugin-html-include)](https://www.npmjs.com/package/vite-plugin-html-include)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![vite version](https://img.shields.io/badge/vite-4%2B%20%7C%205%2B%20%7C%206%2B-blue)](https://vitejs.dev)

---

## Features

- Use `<include file="...">` in your HTML files
- Include `.html` and `.svg` files by default
- Nested includes supported
- Use `<slot>` and `<slot name="...">` for dynamic blocks
- Interpolate variables like `{{$name}}`
- Merges `class` and `style` like Vue.js
- All non-variable attributes are applied to the root element
- Ultra fast and zero dependency
- Automatic full-reload when included files change (dev only)
---

## Install

```bash
npm install --save-dev vite-plugin-html-include
```

---

## Usage

### vite.config.ts

```ts
import { defineConfig } from 'vite'
import htmlInclude from 'vite-plugin-html-include'

export default defineConfig({
  plugins: [
    htmlInclude()
  ]
})
```

---

## Example

### index.html

```html
<include file="components/card.html" $title="Hello">
  <template slot="header">
    <h1>Custom header</h1>
  </template>

  <p>This is the main content</p>

  <template slot="footer">
    <footer>Custom footer</footer>
  </template>
</include>
```

### components/card.html

```html
<div class="card">
  <slot name="header"></slot>
  <div class="body">
    <h2>{{$title}}</h2>
    <slot></slot>
  </div>
  <slot name="footer"></slot>
</div>
```

### Final Output

```html
<div class="card">
    <h1>Custom header</h1>
    <div class="body">
        <h2>Hello</h2>
        <p>This is the main content</p>
    </div>
    <footer>Custom footer</footer>
</div>

```



---

## Variables: `$var` and `data-$var`

You can pass variables to an included component using either `$var="..."` or `data-$var="..."`. Both methods are equivalent.

### Example

```html
<include file="components/card.html" $title="Hello" />
<!-- is equivalent to -->
<include file="components/card.html" data-$title="Hello" />
```

In both cases, the variable `$title` will be injected into the component.

---

## Class and Style Merging

When the included component has a single root element:

- `class` attributes are merged (like Vue)
- `style` attributes are merged with proper `;` normalization
- All other attributes (like `id`, `title`, `data-*`) are injected

### Example

```html
<include file="components/button.html" class="primary" style="color: red;" $text="Click me" title="action" />
```

```html
<!-- components/button.html -->
<button class="btn" style="padding: 10px" title="{{$title}}">
  {{$text}}
</button>
```

**Output:**

```html
<button class="btn primary" style="padding: 10px; color: red;" title="action">
  Click me
</button>
```

---

## Default Slots

If no content is passed, `<slot>` can define default content.

### components/card.html

```html
<div class="card">
  <slot name="header">
    <h2>Default Header</h2>
  </slot>

  <div class="body">
    <slot>
      <p>Default content goes here</p>
    </slot>
  </div>

  <slot name="footer">
    <footer>Default Footer</footer>
  </slot>
</div>
```

### Usage

```html
<include file="components/card.html" />
```

**Output:**

```html
<div class="card">
  <h2>Default Header</h2>
  <div class="body">
    <p>Default content goes here</p>
  </div>
  <footer>Default Footer</footer>
</div>
```

---

## Options

| Option               | Type               | Default             | Description                                     |
| --------------------|--------------------|---------------------|-------------------------------------------------|
| `extensions`         | `string[]`         | `['.html', '.svg']` | Allowed file types                              |
| `delimiters`         | `[string, string]` | `['{{','}}']`       | Variable interpolation delimiters               |
| `allowAbsolutePaths` | `boolean`          | `false`             | Allow absolute file paths                       |
| `watch`              | `boolean`          | `true`              | Auto-reload included files on change during dev |

When `watch` is enabled, you'll see logs like:

```
[vite-plugin-html-include] Reload detected: src/components/card.html
```

---

## Advanced Usage: Custom Delimiters

If you want to use something other than `{{` and `}}`, for example `[[` and `]]`, you can configure it:

```ts
htmlInclude({ delimiters: ['[[', ']]'] })
```

In your HTML:

```html
<div>Hello [[ $name ]]</div>
```

---

## License

MIT © Tilty.io