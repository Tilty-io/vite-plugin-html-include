import fs from 'fs/promises'
import path from 'path'
import {HTMLElement, parse} from 'node-html-parser'
import { createRequire } from 'module'
import type { Plugin } from 'vite'
import pc from 'picocolors'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

export interface HtmlIncludeOptions {
  extensions?: string[]
  delimiters?: [string, string]
  allowAbsolutePaths?: boolean
  watch?: boolean
}

export default function htmlInclude(options: HtmlIncludeOptions = {}): Plugin {
  const {
    extensions = ['.html', '.svg'],
    delimiters = ['{{', '}}'],
    allowAbsolutePaths = false,
    watch = true,
  } = options

  return {
    name: 'vite-plugin-html-include',

    transformIndexHtml: {
      order: 'pre',
      handler: async (html) => {
        return await processIncludes(html, process.cwd())
      },
    },

    handleHotUpdate({ file, server }) {
      if (watch && extensions.some(ext => file.endsWith(ext))) {
        console.log(`[vite-plugin-html-include@${version}] Reload fichier détecté : ${file}`)
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      }
    },
  }

  async function processIncludes(inputHtml: string, baseDir: string): Promise<string> {
    const root = parse(inputHtml, {
      lowerCaseTagName: false,
      comment: true,
      blockTextElements: {
        script: true,
        noscript: true,
        style: true,
        pre: true,
      },
    })

    while (true) {
      const tag = root.querySelector('include')
      if (!tag) break

      const fileAttr = tag.getAttribute('file')
      if (!fileAttr) {
        tag.remove()
        continue
      }

      const resolvedPath = allowAbsolutePaths
          ? path.resolve(baseDir, fileAttr)
          : path.resolve(baseDir, '.' + path.sep + fileAttr)

      if (!extensions.some(ext => resolvedPath.endsWith(ext))) {
        tag.remove()
        continue
      }

      let content: string
      try {
        content = await fs.readFile(resolvedPath, 'utf-8')
        console.log(`[vite-plugin-html-include@${version}] Chargé : ${resolvedPath}`)
      } catch {
        console.warn(pc.red(`[vite-plugin-html-include@${version}] Erreur lecture: ${resolvedPath}`));
        tag.remove()
        continue
      }

      const includedHtml = await processIncludes(content, path.dirname(resolvedPath))

      const variables = Object.fromEntries(
          Object.entries(tag.attributes).filter(([k]) => k !== 'file')
      )
      const interpolated = interpolateVariables(includedHtml, variables)

      const parsed = parse(interpolated)


      // Gestion intelligente de class (comme Vue.js)
      const includeClass = tag.getAttribute('class')
      const children = parsed.childNodes.filter(n => n.nodeType === 1) // éléments HTML uniquement

      if (includeClass) {
        if (children.length === 1) {
          const rootEl = children[0] as HTMLElement
          const existingClass = rootEl.getAttribute('class') || ''
          const merged = (existingClass + ' ' + includeClass).trim()
          rootEl.setAttribute('class', merged)
        } else {
          console.warn(pc.yellow(`[vite-plugin-html-include@${version}] Impossible d'ajouter class='${includeClass}' car le composant "${fileAttr}" a plusieurs éléments racines.`))
        }
      }

      const defaultSlot = tag.innerHTML.trim()
      const slotNamedMap = new Map<string, string>()

      tag.querySelectorAll('template[slot]').forEach(tpl => {
        const name = tpl.getAttribute('slot')
        if (name) slotNamedMap.set(name, tpl.innerHTML.trim())
      })

      parsed.querySelectorAll('slot').forEach(slot => {
        const name = slot.getAttribute('name')
        if (name) {
          if (slotNamedMap.has(name)) {
            slot.replaceWith(slotNamedMap.get(name)!)
          } else {
            // Slot nommé non remplacé : on garde son contenu d'origine (slot par défaut)
          }
        } else {
          // Slot par défaut
          slot.replaceWith(defaultSlot)
        }
      })

      tag.replaceWith(parsed.toString())
    }

    return root.toString()
  }

  function interpolateVariables(html: string, vars: Record<string, string>): string {
    const [open, close] = delimiters
    return html.replace(
        new RegExp(`${escapeRegex(open)}(.*?)${escapeRegex(close)}`, 'g'),
        (_, key) => vars[key.trim()] ?? ''
    )
  }

  function escapeRegex(str: string): string {
    return str.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')
  }
}
