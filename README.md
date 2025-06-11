


# vite-plugin-html-include

> A Vite plugin to include partial HTML and SVG files with variable interpolation and slot support — dead simple and fast.

[![npm](https://img.shields.io/npm/v/vite-plugin-html-include)](https://www.npmjs.com/package/vite-plugin-html-include)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![vite version](https://img.shields.io/badge/vite-4%2B%20%7C%205%2B-blue)](https://vitejs.dev)

---

## ✨ Features

- ✅ Use `<include file="...">` in your HTML files
- ✅ Interpolate variables like `{{name}}`
- ✅ Use `<slot>` and `<slot name="...">` for dynamic blocks
- ✅ Include `.html` and `.svg` files by default
- ✅ Nested includes supported
- ✅ Automatic full-reload when included files change (dev only)
- ✅ Ultra fast and zero dependency

---

## 🚀 Install

```bash
npm install --save-dev vite-plugin-html-include
````

---

## 🔧 Usage

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

## 📁 Example

### `index.html`

```html
<include file="components/card.html" title="Hello">
  <template slot="header">
    <h1>Custom header</h1>
  </template>

  <p>This is the main content</p>

  <template slot="footer">
    <footer>Custom footer</footer>
  </template>
</include>
```

### `components/card.html`

```html
<div class="card">
  <slot name="header"></slot>
  <div class="body">
    <h2>{{title}}</h2>
    <slot></slot>
  </div>
  <slot name="footer"></slot>
</div>
```

---

## 🧠 Tip: Inline SVG

You can also inline static SVG icons:

```html
<include file="icons/check.svg" />
```

---

## 🧪 Examples

### ✅ Slot + variable interpolation

**index.html**

```html
<include file="card.html" title="Bienvenue !">
  <template slot="header">
    <h1>👋 Hello</h1>
  </template>

  <p>Ceci est le contenu du slot principal.</p>

  <template slot="footer">
    <footer>— Signature ici</footer>
  </template>
</include>
```

**card.html**

```html
<div class="card">
  <slot name="header"></slot>

  <div class="body">
    <h2>{{title}}</h2>
    <slot></slot>
  </div>

  <slot name="footer"></slot>
</div>
```

➡️ **Output final :**

```html
<div class="card">
  <h1>👋 Hello</h1>

  <div class="body">
    <h2>Bienvenue !</h2>
    <p>Ceci est le contenu du slot principal.</p>
  </div>

  <footer>— Signature ici</footer>
</div>
```

---

## ⚙️ Options

| Option               | Type               | Default             | Description                                     |
| -------------------- | ------------------ | ------------------- | ----------------------------------------------- |
| `extensions`         | `string[]`         | `['.html', '.svg']` | Allowed file types                              |
| `delimiters`         | `[string, string]` | `['{{','}}']`       | Variable interpolation delimiters               |
| `allowAbsolutePaths` | `boolean`          | `false`             | Allow absolute file paths                       |
| `watch`              | `boolean`          | `true`              | Auto-reload included files on change during dev |

When `watch` is enabled, you'll see logs like:

```
[vite-plugin-html-include] watching: src/components/card.html
```



