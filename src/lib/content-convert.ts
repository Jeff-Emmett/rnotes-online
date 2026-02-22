import { NoteType } from '@prisma/client';

// ─── TipTap JSON types ──────────────────────────────────────────────

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

// ─── HTML → TipTap JSON ────────────────────────────────────────────
// Lightweight server-side parser — handles the HTML subset TipTap produces.
// We avoid importing the full TipTap editor server-side (it requires DOM shims).

function parseSimpleHtml(html: string): TipTapDoc {
  const doc: TipTapDoc = { type: 'doc', content: [] };
  if (!html || !html.trim()) return doc;

  // Split into block-level elements
  const blockRegex = /<(h[1-6]|p|blockquote|pre|ul|ol|hr|img)([^>]*)>([\s\S]*?)<\/\1>|<(hr|img)([^>]*?)\s*\/?>|<(ul|ol)([^>]*)>([\s\S]*?)<\/\6>/gi;

  let remaining = html;
  let match;
  const blocks: TipTapNode[] = [];

  // Simple recursive parser for inline content
  function parseInline(text: string): TipTapNode[] {
    const nodes: TipTapNode[] = [];
    if (!text) return nodes;

    // Strip outer tags if wrapped in <p>
    text = text.replace(/^<p[^>]*>|<\/p>$/gi, '');

    // Replace <br> with newline markers
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Process inline elements
    const inlineRegex = /<(strong|b|em|i|s|del|code|a|mark|u)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let lastIndex = 0;
    let inlineMatch;

    while ((inlineMatch = inlineRegex.exec(text)) !== null) {
      // Text before this match
      if (inlineMatch.index > lastIndex) {
        const before = decodeEntities(text.slice(lastIndex, inlineMatch.index));
        if (before) nodes.push({ type: 'text', text: before });
      }

      const tag = inlineMatch[1].toLowerCase();
      const attrs = inlineMatch[2];
      const inner = inlineMatch[3];

      const marks: { type: string; attrs?: Record<string, unknown> }[] = [];
      if (tag === 'strong' || tag === 'b') marks.push({ type: 'bold' });
      else if (tag === 'em' || tag === 'i') marks.push({ type: 'italic' });
      else if (tag === 's' || tag === 'del') marks.push({ type: 'strike' });
      else if (tag === 'code') marks.push({ type: 'code' });
      else if (tag === 'a') {
        const hrefMatch = attrs.match(/href="([^"]*)"/);
        marks.push({ type: 'link', attrs: { href: hrefMatch?.[1] || '' } });
      }

      const innerNodes = parseInline(inner);
      for (const node of innerNodes) {
        nodes.push({
          ...node,
          marks: [...(node.marks || []), ...marks],
        });
      }

      lastIndex = inlineMatch.index + inlineMatch[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      const rest = decodeEntities(text.slice(lastIndex));
      if (rest) nodes.push({ type: 'text', text: rest });
    }

    return nodes.length > 0 ? nodes : [{ type: 'text', text: decodeEntities(text) }];
  }

  function parseListItems(html: string): TipTapNode[] {
    const items: TipTapNode[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(html)) !== null) {
      // Check for task list items
      const taskMatch = liMatch[1].match(/^<input[^>]*type="checkbox"[^>]*(checked)?[^>]*\/?>\s*/i);
      if (taskMatch) {
        const content = liMatch[1].replace(/<input[^>]*\/?>\s*/i, '');
        items.push({
          type: 'taskItem',
          attrs: { checked: !!taskMatch[1] },
          content: [{ type: 'paragraph', content: parseInline(content) }],
        });
      } else {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(liMatch[1]) }],
        });
      }
    }
    return items;
  }

  // Process block elements via regex
  const fullBlockRegex = /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>|<(p)([^>]*)>([\s\S]*?)<\/\4>|<(blockquote)([^>]*)>([\s\S]*?)<\/\7>|<(pre)([^>]*)>([\s\S]*?)<\/\10>|<(ul|ol)([^>]*)>([\s\S]*?)<\/\12>|<(hr)[^>]*\/?>|<(img)([^>]*?)\/?>|<(li)([^>]*)>([\s\S]*?)<\/\18>/gi;

  while ((match = fullBlockRegex.exec(html)) !== null) {
    if (match[1]) {
      // Heading
      const level = parseInt(match[1].charAt(1));
      const content = parseInline(match[3]);
      blocks.push({ type: 'heading', attrs: { level }, content });
    } else if (match[4]) {
      // Paragraph
      const content = parseInline(match[6]);
      blocks.push({ type: 'paragraph', content });
    } else if (match[7]) {
      // Blockquote
      const innerBlocks = parseSimpleHtml(match[9]);
      blocks.push({ type: 'blockquote', content: innerBlocks.content });
    } else if (match[10]) {
      // Code block
      const code = match[12].replace(/<code[^>]*>|<\/code>/gi, '');
      blocks.push({
        type: 'codeBlock',
        content: [{ type: 'text', text: decodeEntities(code) }],
      });
    } else if (match[12]) {
      // List (ul/ol)
      const listType = match[12].toLowerCase();
      const items = parseListItems(match[14]);

      // Check if it's a task list
      const hasTaskItems = items.some((i) => i.type === 'taskItem');
      if (hasTaskItems) {
        blocks.push({ type: 'taskList', content: items });
      } else {
        blocks.push({
          type: listType === 'ol' ? 'orderedList' : 'bulletList',
          content: items,
        });
      }
    } else if (match[15]) {
      // Horizontal rule
      blocks.push({ type: 'horizontalRule' });
    } else if (match[16]) {
      // Image
      const srcMatch = match[17]?.match(/src="([^"]*)"/);
      const altMatch = match[17]?.match(/alt="([^"]*)"/);
      if (srcMatch) {
        blocks.push({
          type: 'image',
          attrs: { src: srcMatch[1], alt: altMatch?.[1] || '' },
        });
      }
    }
  }

  // If no blocks were parsed, wrap the whole thing as a paragraph
  if (blocks.length === 0 && html.trim()) {
    blocks.push({ type: 'paragraph', content: parseInline(html) });
  }

  doc.content = blocks;
  return doc;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function htmlToTipTapJson(html: string): TipTapDoc {
  return parseSimpleHtml(html);
}

// ─── TipTap JSON → HTML ────────────────────────────────────────────

function renderMarks(text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): string {
  if (!marks || marks.length === 0) return escapeHtml(text);

  let result = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        result = `<a href="${escapeHtml(String(mark.attrs?.href || ''))}">${result}</a>`;
        break;
    }
  }
  return result;
}

function renderNode(node: TipTapNode): string {
  if (node.type === 'text') {
    return renderMarks(node.text || '', node.marks);
  }

  const children = (node.content || []).map(renderNode).join('');

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return `<p>${children}</p>`;
    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${children}</h${level}>`;
    case 'bulletList':
      return `<ul>${children}</ul>`;
    case 'orderedList':
      return `<ol>${children}</ol>`;
    case 'listItem':
      return `<li>${children}</li>`;
    case 'taskList':
      return `<ul data-type="taskList">${children}</ul>`;
    case 'taskItem': {
      const checked = node.attrs?.checked ? ' checked' : '';
      return `<li data-type="taskItem"><input type="checkbox"${checked}>${children}</li>`;
    }
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${children}</code></pre>`;
    case 'horizontalRule':
      return '<hr>';
    case 'image':
      return `<img src="${escapeHtml(String(node.attrs?.src || ''))}" alt="${escapeHtml(String(node.attrs?.alt || ''))}">`;
    case 'hardBreak':
      return '<br>';
    default:
      return children;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function tipTapJsonToHtml(json: TipTapDoc): string {
  return renderNode(json as unknown as TipTapNode);
}

// ─── TipTap JSON → Markdown ────────────────────────────────────────

function renderMarksMd(text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `**${result}**`;
        break;
      case 'italic':
        result = `*${result}*`;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'link':
        result = `[${result}](${mark.attrs?.href || ''})`;
        break;
    }
  }
  return result;
}

function nodeToMarkdown(node: TipTapNode, indent: string = ''): string {
  if (node.type === 'text') {
    return renderMarksMd(node.text || '', node.marks);
  }

  const childrenText = (node.content || [])
    .map((child) => nodeToMarkdown(child, indent))
    .join('');

  switch (node.type) {
    case 'doc':
      return (node.content || [])
        .map((child) => nodeToMarkdown(child, ''))
        .join('\n\n');
    case 'paragraph':
      return childrenText;
    case 'heading': {
      const level = (node.attrs?.level as number) || 1;
      return '#'.repeat(level) + ' ' + childrenText;
    }
    case 'bulletList':
      return (node.content || [])
        .map((child) => nodeToMarkdown(child, indent))
        .join('\n');
    case 'orderedList':
      return (node.content || [])
        .map((child, i) => {
          const text = nodeToMarkdown(child, indent);
          return text.replace(/^- /, `${i + 1}. `);
        })
        .join('\n');
    case 'listItem': {
      const inner = (node.content || [])
        .map((child) => nodeToMarkdown(child, indent + '  '))
        .join('\n' + indent + '  ');
      return `${indent}- ${inner}`;
    }
    case 'taskList':
      return (node.content || [])
        .map((child) => nodeToMarkdown(child, indent))
        .join('\n');
    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' ';
      const inner = (node.content || [])
        .map((child) => nodeToMarkdown(child, indent + '  '))
        .join('\n' + indent + '  ');
      return `${indent}- [${checked}] ${inner}`;
    }
    case 'blockquote':
      return (node.content || [])
        .map((child) => '> ' + nodeToMarkdown(child, ''))
        .join('\n');
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) || '';
      return '```' + lang + '\n' + childrenText + '\n```';
    }
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    case 'hardBreak':
      return '  \n';
    default:
      return childrenText;
  }
}

export function tipTapJsonToMarkdown(json: TipTapDoc): string {
  return nodeToMarkdown(json as unknown as TipTapNode);
}

// ─── Markdown → TipTap JSON ────────────────────────────────────────
// Uses marked to parse markdown to HTML, then HTML to TipTap JSON.

export async function markdownToTipTapJson(md: string): Promise<TipTapDoc> {
  const { marked } = await import('marked');
  const html = await marked.parse(md);
  return htmlToTipTapJson(html);
}

// ─── NoteType → cardType mapping ───────────────────────────────────

const NOTE_TYPE_TO_CARD_TYPE: Record<string, string> = {
  NOTE: 'note',
  BOOKMARK: 'link',
  CLIP: 'reference',
  IMAGE: 'file',
  FILE: 'file',
  AUDIO: 'file',
  CODE: 'note',
};

export function mapNoteTypeToCardType(noteType: NoteType | string): string {
  return NOTE_TYPE_TO_CARD_TYPE[noteType] || 'note';
}
