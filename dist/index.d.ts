import type { Plugin } from 'vite';
export interface HtmlIncludeOptions {
    extensions?: string[];
    delimiters?: [string, string];
    allowAbsolutePaths?: boolean;
    watch?: boolean;
}
export default function htmlInclude(options?: HtmlIncludeOptions): Plugin;
