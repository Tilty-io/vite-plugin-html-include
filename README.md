# vite-plugin-html-include

> A Vite plugin to include partial HTML and SVG files with variable interpolation and slot support — dead simple and fast.

[![npm](https://img.shields.io/npm/v/vite-plugin-html-include)](https://www.npmjs.com/package/vite-plugin-html-include)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![vite version](https://img.shields.io/badge/vite-4%2B%20%7C%205%2B%20%7C%206%2B-blue)](https://vitejs.dev)

---

## Features

- Use `<include file="...">` in your HTML files
- Interpolate variables like `{{name}}`
- Use `<slot>` and `<slot name="...">` for dynamic blocks
- Include `.html` and `.svg` files by default
- Nested includes supported
- Automatic full-reload when included files change (dev only)
- Ultra fast and zero dependency

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

## Tip: Inline SVG

You can also inline static SVG icons:

```html
<include file="icons/check.svg" />
```

---

## Class Attribute

You can add CSS classes to your included components:

```html
<include file="components/button.html" class="primary large" text="Click me" />
```

**components/button.html**

```html
<button class="btn {{class}}">{{text}}</button>
```

**Output:**

```html
<button class="btn primary large">Click me</button>
```

---

## Default Slots

You can define default content for slots that will be used when no content is provided:

**components/card.html**

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

**Usage without slots:**

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

## Examples

### Slot + variable interpolation

**index.html**

```html
<include file="card.html" title="Welcome!">
  <template slot="header">
    <h1>👋 Hello</h1>
  </template>

  <p>This is the main slot content.</p>

  <template slot="footer">
    <footer>— Signature here</footer>
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

**Final output:**

```html
<div class="card">
  <h1>👋 Hello</h1>

  <div class="body">
    <h2>Welcome!</h2>
    <p>This is the main slot content.</p>
  </div>

  <footer>— Signature here</footer>
</div>
```

---

## Options

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



## 🔧 PhpStorm Integration (Optional but Useful)

To improve the developer experience when working with custom `<include>` tags in your HTML, you can enable schema-based validation and autocompletion in PhpStorm.

### Steps:

1. Copy the schema file `schema/html-include.xsd` from this plugin:
   node_modules/vite-plugin-html-include/schema/html-include.xsd

markdown
Copier
Modifier
2. Open PhpStorm settings:
   Preferences > Languages & Frameworks > Schemas and DTDs > XML Catalog

markdown
Copier
Modifier
3. Click the **+** button and fill in:
- **URI**: `http://www.tilty.io/html-include`
- **Location**: the full path to `html-include.xsd` (can be relative to your project)
- **Namespace**: `http://www.tilty.io/html-include`

4. In your HTML files, use the following declaration to activate the schema:

```html
<html xmlns:inc="http://www.tilty.io/html-include"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xsi:schemaLocation="http://www.tilty.io/html-include ./schema/html-include.xsd">
<body>
<include file="partials/card.html" class="my-card" />
</body>
</html>
Notes:
PhpStorm will now recognize <include> tags as valid elements and offer auto-completion for attributes like file and class.

This setup is local to your PhpStorm environment and must be configured per project unless shared via IDE settings export.

pgsql
Copier
Modifier

Souhaites-tu que je t’intègre aussi le fichier `html-include.xsd` en version raw ?