import fs from 'fs/promises'
import path from 'path'
import { parse } from 'node-html-parser'
import type { Plugin, ViteDevServer } from 'vite'

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

  const watchedFiles = new Set<string>()

  return {
    name: 'vite-plugin-html-include',

    transformIndexHtml: {
      order: 'pre',
      handler: async (html, ctx) => {
        watchedFiles.clear()
        const finalHtml = await processIncludes(html, process.cwd())

        // Ajoute explicitement les fichiers surveillés au watcher de Vite
        if (watch && ctx?.server) {
          for (const file of watchedFiles) {
            ctx.server.watcher.add(file)
          }
        }

        return finalHtml
      },
    },

    handleHotUpdate({ file, server }) {
      if (watch && watchedFiles.has(file)) {
        // Déclenche un rechargement complet si un fichier inclus est modifié
        server.ws.send({ type: 'full-reload', path: '*' })
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
        if (watch) {
          watchedFiles.add(resolvedPath)
          console.log(`[vite-plugin-html-include] watching: ${resolvedPath}`)
        }
      } catch {
        console.warn(`[vite-plugin-html-include] Erreur lecture: ${resolvedPath}`)
        tag.remove()
        continue
      }

      const includedHtml = await processIncludes(content, path.dirname(resolvedPath))

      const variables = Object.fromEntries(
          Object.entries(tag.attributes).filter(([k]) => k !== 'file')
      ) as Record<string, string>
      const interpolated = interpolateVariables(includedHtml, variables)

      const parsed = parse(interpolated)
      const defaultSlot = tag.innerHTML.trim()
      const slotNamedMap = new Map<string, string>()

      tag.querySelectorAll('template[slot]').forEach((tpl: any) => {
        const name = tpl.getAttribute('slot')
        if (name) slotNamedMap.set(name, tpl.innerHTML.trim())
      })

      parsed.querySelectorAll('slot').forEach((slot: any) => {
        const name = slot.getAttribute('name')
        if (name && slotNamedMap.has(name)) {
          slot.replaceWith(slotNamedMap.get(name)!)
        } else if (!name) {
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
