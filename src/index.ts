import fs from 'fs/promises'
import path from 'path'
import { HTMLElement, parse } from 'node-html-parser'
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
        console.warn(pc.red(`[vite-plugin-html-include@${version}] Erreur lecture: ${resolvedPath}`))
        tag.remove()
        continue
      }

      const includedHtml = await processIncludes(content, path.dirname(resolvedPath))

      const interpolated = interpolateVariables(includedHtml, extractVars(tag.attributes))
      const parsed = parse(interpolated)

      // Slot logic
      const defaultSlot = tag.innerHTML.trim()
      const slotNamedMap = new Map<string, string>()
      tag.querySelectorAll('template[slot]').forEach(tpl => {
        const name = tpl.getAttribute('slot')
        if (name) slotNamedMap.set(name, tpl.innerHTML.trim())
      })
      parsed.querySelectorAll('slot').forEach(slot => {
        const name = slot.getAttribute('name')
        if (name && slotNamedMap.has(name)) {
          slot.replaceWith(slotNamedMap.get(name)!)
        } else if (!name) {
          slot.replaceWith(defaultSlot)
        }
      })

      // Récupération des éléments HTML enfants
      const children = parsed.childNodes.filter(n => n.nodeType === 1)

      if (children.length === 1) {
        const rootEl = children[0] as HTMLElement

        for (const [attr, val] of Object.entries(tag.attributes)) {
          if (attr.startsWith('$') || attr === 'file') continue

          // Fusion des classes (comme Vue.js)
          if (attr === 'class') {
            const existing = rootEl.getAttribute('class') || ''
            rootEl.setAttribute('class', (existing + ' ' + val).trim())
          }

          // Fusion des styles (comme Vue.js)
          else if (attr === 'style') {
            const existing = rootEl.getAttribute('style') || ''
            const merged = [existing, val]
                .filter(Boolean)
                .map(s => s.trim().replace(/;*$/, '')) // supprime les ; en trop
                .join('; ') + ';'
            rootEl.setAttribute('style', merged)
          }

          // Tous les autres attributs normaux
          else {
            rootEl.setAttribute(attr, val)
          }
        }
      } else if (tag.getAttribute('class') || tag.getAttribute('style')) {
        console.warn(pc.yellow(`[vite-plugin-html-include@${version}] Impossible d'ajouter class/style car le composant "${fileAttr}" a plusieurs éléments racines.`))
      }


      tag.replaceWith(parsed.toString())
    }

    return root.toString()
  }

  /**
   * Extrait les variables passées sous forme $key="value"
   */
  function extractVars(attributes: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(attributes)
            .filter(([k]) => k.startsWith('$'))
            .map(([k, v]) => [k.slice(1), v])
    )
  }

  /**
   * Remplace uniquement les `{{$var}}` par leur valeur
   */
  function interpolateVariables(html: string, vars: Record<string, string>): string {
    const [open, close] = delimiters
    return html.replace(
        new RegExp(`${escapeRegex(open)}\\$(.*?)${escapeRegex(close)}`, 'g'),
        (_, key) => vars[key.trim()] ?? ''
    )
  }

  /**
   * Échappe une chaîne pour l'utiliser dans une RegExp
   */
  function escapeRegex(str: string): string {
    return str.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')
  }
}
