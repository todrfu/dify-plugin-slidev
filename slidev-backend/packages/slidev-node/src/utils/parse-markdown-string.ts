/**
 * 解析 Markdown 字符串，处理各种格式的输入
 *
 * @param input Markdown 字符串输入，可能是 JSON 字符串或普通字符串
 * @returns 处理后的 Markdown 字符串
 */
export function parseMarkdownString(markdownString: string): string {
  // 如果输入是JSON字符串格式（带双引号），先尝试使用JSON.parse解析
  if (markdownString.startsWith('"') && markdownString.endsWith('"')) {
    try {
      return JSON.parse(`{"content":${markdownString}}`).content;
    } catch (e) {
      console.log('JSON解析失败，将直接处理转义字符');
    }
  }

  // 如果是单引号包裹的字符串，先移除单引号然后处理转义字符
  if (markdownString.startsWith("'") && markdownString.endsWith("'")) {
    markdownString = markdownString.substring(1, markdownString.length - 1);
  }

  // 直接替换常见的转义字符
  return markdownString
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}
