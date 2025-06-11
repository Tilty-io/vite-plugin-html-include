import fs from 'fs/promises'
import path from 'path'
import { Plugin } from 'vite'
import { parse } from 'node-html-parser'

interface HtmlIncludeOptions {
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
        console.log(`[vite-plugin-html-include] Reload déclenché pour : ${file}`)
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
      const includeTag = root.querySelector('include')
      if (!includeTag) break

      const fileAttr = includeTag.getAttribute('file')
      if (!fileAttr) {
        includeTag.remove()
        continue
      }

      const resolvedPath = allowAbsolutePaths
          ? path.resolve(baseDir, fileAttr)
          : path.resolve(baseDir, '.' + path.sep + fileAttr)

      if (!extensions.some(ext => resolvedPath.endsWith(ext))) {
        includeTag.remove()
        continue
      }

      let content: string
      try {
        content = await fs.readFile(resolvedPath, 'utf8')
      } catch (e) {
        console.warn(`[vite-plugin-html-include] Erreur de lecture de ${resolvedPath}`)
        includeTag.remove()
        continue
      }

      const processedContent = await processIncludes(content, path.dirname(resolvedPath))

      const variables = Object.fromEntries(
          Object.entries(includeTag.attributes).filter(([k]) => k !== 'file')
      )

      const interpolated = interpolateVariables(processedContent, variables)

      const defaultSlot = includeTag.innerHTML.trim()
      const slotNamedMap = new Map<string, string>()

      includeTag.querySelectorAll('template[slot]').forEach(template => {
        const name = template.getAttribute('slot')
        if (name) {
          slotNamedMap.set(name, template.innerHTML.trim())
        }
      })

      const slotRoot = parse(interpolated)
      slotRoot.querySelectorAll('slot').forEach(slot => {
        const name = slot.getAttribute('name')
        if (name && slotNamedMap.has(name)) {
          slot.replaceWith(slotNamedMap.get(name)!)
        } else if (!name) {
          slot.replaceWith(defaultSlot)
        }
      })

      includeTag.replaceWith(slotRoot.toString())
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

  function escapeRegex(s: string): string {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  }
}
