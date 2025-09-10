// a
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

  let viteConfig: any = null

  function resolveWithAlias(fileAttr: string): string {
    if (viteConfig && viteConfig.resolve && Array.isArray(viteConfig.resolve.alias)) {
      for (const alias of viteConfig.resolve.alias) {
        if (typeof alias === 'object' && alias.find && alias.replacement) {
          if (fileAttr.startsWith(alias.find + '/')) {
            return fileAttr.replace(alias.find, alias.replacement)
          }
        } else if (typeof alias === 'object' && alias.find && alias.replacement !== undefined) {
          if (fileAttr.startsWith(alias.find + '/')) {
            return fileAttr.replace(alias.find, alias.replacement)
          }
        }
      }
    }
    return fileAttr
  }

  return {
    name: 'vite-plugin-html-include',

    configResolved(config) {
      viteConfig = config
    },

    transformIndexHtml: {
      order: 'pre',
      handler: async (html, { filename }) => {
        return await processIncludes(html, process.cwd(), {}, filename)
      },
    },

    handleHotUpdate({ file, server }) {
      if (watch && extensions.some(ext => file.endsWith(ext))) {
        console.log(`[vite-plugin-html-include@${version}] File changed: ${file}`)
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      }
    },
  }

  /**
   * Fonction principale qui traite récursivement les balises <include>
   */
  async function processIncludes(
    inputHtml: string,
    baseDir: string,
    inheritedVars: Record<string, string>,
    sourceFile: string | null = null
  ): Promise<string> {
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

      // Fusionner les variables héritées avec celles locales
      const localVars = extractVars(tag.attributes)
      const mergedVars = { ...inheritedVars, ...localVars }

      // Interpolation du chemin avec les variables merged
      const fileAttrRaw = tag.getAttribute('file')
      if (!fileAttrRaw) {
        tag.remove()
        continue
      }
      const fileAttr = interpolateVariables(fileAttrRaw, mergedVars)

      let resolvedPath = fileAttr
      if (viteConfig && viteConfig.resolve && viteConfig.resolve.alias) {
        resolvedPath = resolveWithAlias(fileAttr)
      }
      if (resolvedPath !== fileAttr) {
        resolvedPath = path.resolve(resolvedPath)
      } else {
        resolvedPath = fileAttr.startsWith('/')
          ? path.resolve(process.cwd(), fileAttr.slice(1))
          : allowAbsolutePaths
              ? path.resolve(baseDir, fileAttr)
              : path.resolve(baseDir, '.' + path.sep + fileAttr)
      }

      if (!extensions.some(ext => resolvedPath.endsWith(ext))) {
        console.warn(pc.yellow(`[vite-plugin-html-include@${version}] Skipping (extension not allowed): ${resolvedPath}`))
        tag.remove()
        continue
      }

      let content: string
      try {
        content = await fs.readFile(resolvedPath, 'utf-8')
        console.log(pc.green(`[vite-plugin-html-include@${version}] Loaded: ${resolvedPath}`))
      } catch {
        console.warn(pc.red(
          `[vite-plugin-html-include@${version}] Error reading file: ${resolvedPath}\n` +
          `↪ referenced in: ${sourceFile || '(unknown source)'}\n  (include: file=\"${fileAttrRaw}\")`
        ))
        tag.remove()
        continue
      }

      // Traitement récursif avec les variables merged
      const includedHtml = await processIncludes(
        content,
        path.dirname(resolvedPath),
        mergedVars,
        sourceFile || resolvedPath // on garde la source initiale
      )

      const interpolated = interpolateVariables(includedHtml, mergedVars)
      const parsed = parse(interpolated)

      // Slot handling
      const defaultContentToInject = tag.innerHTML.trim()
      const slotNamedMap = new Map<string, string>()
      if(defaultContentToInject){
        slotNamedMap.set("default", defaultContentToInject);
      }
      tag.querySelectorAll('template[slot]').forEach(tpl => {
        let name = tpl.getAttribute('slot');
        if (name) slotNamedMap.set(name, tpl.innerHTML.trim())
      })
      parsed.querySelectorAll('slot').forEach(slot => {
        let name = slot.getAttribute('name');
        if(!name){name="default";}
        if (name && slotNamedMap.has(name)) {
            // remplace le slot par le contenu fourni dans le template correspondant
          slot.replaceWith(slotNamedMap.get(name)!);
        } else {
          // remplace le slot par son contenu par défaut
          slot.replaceWith(slot.innerHTML.trim());
        }
      })

      // Injection des attributs normaux
      const children = parsed.childNodes.filter(n => n.nodeType === 1)
      if (children.length === 1) {
        const rootEl = children[0] as HTMLElement

        for (const [attr, val] of Object.entries(tag.attributes)) {
          if (attr.startsWith('$') || attr === 'file') continue

          if (attr === 'class') {
            const existing = rootEl.getAttribute('class') || ''
            rootEl.setAttribute('class', (existing + ' ' + val).trim())
          } else if (attr === 'style') {
            const existing = rootEl.getAttribute('style') || ''
            const merged = [existing, val]
                .filter(Boolean)
                .map(s => s.trim().replace(/;*$/, ''))
                .join('; ') + ';'
            rootEl.setAttribute('style', merged)
          } else {
            rootEl.setAttribute(attr, val)
          }
        }
      } else if (tag.getAttribute('class') || tag.getAttribute('style')) {
        console.warn(pc.yellow(`[vite-plugin-html-include@${version}] Cannot apply class/style: "${fileAttr}" has multiple root elements.`))
      }

      tag.replaceWith(parsed.toString())
    }

    return root.toString()
  }

  /**
   * Extrait les attributs $var="value"
   */
  function extractVars(attributes: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(attributes)
            .filter(([k]) => k.startsWith('$'))
            .map(([k, v]) => [k.slice(1), v])
    )
  }

  /**
   * Interpolation des variables avec support de valeur par défaut
   * ex: {{$key=default}}
   */
  function interpolateVariables(html: string, vars: Record<string, string>): string {
    const [open, close] = delimiters
    const regex = new RegExp(`${escapeRegex(open)}\\s*\\$(.*?)\\s*${escapeRegex(close)}`, 'g')
    return html.replace(regex, (_, raw) => {
      const [key, def] = raw.split('=').map((s: string) => s.trim())
      return vars[key] ?? def ?? ''
    })
  }

  function escapeRegex(str: string): string {
    return str.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')
  }
}
