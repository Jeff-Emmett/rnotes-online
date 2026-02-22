/**
 * Logseq format bidirectional conversion.
 *
 * Export: Note → Logseq page (markdown with frontmatter-style properties)
 * Import: Logseq page → Note fields
 */

// ─── Export ─────────────────────────────────────────────────────────

interface ExportNote {
  title: string;
  cardType: string;
  visibility: string;
  bodyMarkdown: string | null;
  contentPlain: string | null;
  properties: Record<string, unknown>;
  tags: { tag: { name: string } }[];
  children?: { title: string }[];
  attachments?: { file: { storageKey: string; filename: string } ; caption: string | null }[];
}

export function noteToLogseqPage(note: ExportNote): string {
  const lines: string[] = [];

  // Properties block (Logseq `key:: value` format)
  if (note.cardType && note.cardType !== 'note') {
    lines.push(`type:: ${note.cardType}`);
  }
  if (note.tags.length > 0) {
    lines.push(`tags:: ${note.tags.map((t) => `#${t.tag.name}`).join(', ')}`);
  }
  if (note.visibility && note.visibility !== 'private') {
    lines.push(`visibility:: ${note.visibility}`);
  }
  // Custom properties
  const props = note.properties || {};
  for (const [key, value] of Object.entries(props)) {
    if (value != null && value !== '' && !['type', 'tags', 'visibility'].includes(key)) {
      lines.push(`${key}:: ${String(value)}`);
    }
  }

  // Blank line between properties and content
  if (lines.length > 0) {
    lines.push('');
  }

  // Body content as outline blocks
  const body = note.bodyMarkdown || note.contentPlain || '';
  if (body.trim()) {
    // Split into paragraphs and prefix with `- `
    const paragraphs = body.split(/\n\n+/).filter(Boolean);
    for (const para of paragraphs) {
      const subLines = para.split('\n');
      lines.push(`- ${subLines[0]}`);
      for (let i = 1; i < subLines.length; i++) {
        lines.push(`  ${subLines[i]}`);
      }
    }
  }

  // Child notes as indented blocks
  if (note.children && note.children.length > 0) {
    for (const child of note.children) {
      lines.push(`  - [[${child.title}]]`);
    }
  }

  // Attachment references
  if (note.attachments && note.attachments.length > 0) {
    lines.push('');
    for (const att of note.attachments) {
      const caption = att.caption || att.file.filename;
      lines.push(`- ![${caption}](../assets/${att.file.storageKey})`);
    }
  }

  return lines.join('\n');
}

export function sanitizeLogseqFilename(title: string): string {
  return title
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200);
}

// ─── Import ─────────────────────────────────────────────────────────

interface ImportedNote {
  title: string;
  cardType: string;
  visibility: string;
  bodyMarkdown: string;
  properties: Record<string, string>;
  tags: string[];
  childTitles: string[];
  attachmentPaths: string[];
}

export function logseqPageToNote(filename: string, content: string): ImportedNote {
  const title = filename
    .replace(/\.md$/, '')
    .replace(/_/g, ' ')
    .replace(/%[0-9A-Fa-f]{2}/g, (m) => decodeURIComponent(m));

  const lines = content.split('\n');
  const properties: Record<string, string> = {};
  const tags: string[] = [];
  let cardType = 'note';
  let visibility = 'private';
  const bodyLines: string[] = [];
  const childTitles: string[] = [];
  const attachmentPaths: string[] = [];
  let inProperties = true;

  for (const line of lines) {
    // Parse property lines (key:: value)
    const propMatch = line.match(/^([a-zA-Z_-]+)::\s*(.+)$/);
    if (propMatch && inProperties) {
      const [, key, value] = propMatch;
      if (key === 'type') {
        cardType = value.trim();
      } else if (key === 'tags') {
        // Parse #tag1, #tag2
        const tagMatches = value.matchAll(/#([a-zA-Z0-9_-]+)/g);
        for (const m of tagMatches) {
          tags.push(m[1].toLowerCase());
        }
      } else if (key === 'visibility') {
        visibility = value.trim();
      } else {
        properties[key] = value.trim();
      }
      continue;
    }

    // Empty line after properties section
    if (inProperties && line.trim() === '') {
      inProperties = false;
      continue;
    }
    inProperties = false;

    // Parse outline blocks
    const outlineMatch = line.match(/^(\s*)- (.+)$/);
    if (outlineMatch) {
      const indent = outlineMatch[1].length;
      const text = outlineMatch[2];

      // Check for wiki-link child references
      const wikiMatch = text.match(/^\[\[(.+)\]\]$/);
      if (wikiMatch && indent >= 2) {
        childTitles.push(wikiMatch[1]);
        continue;
      }

      // Check for image/attachment references
      const imgMatch = text.match(/^!\[([^\]]*)\]\(\.\.\/assets\/(.+)\)$/);
      if (imgMatch) {
        attachmentPaths.push(imgMatch[2]);
        continue;
      }

      // Regular content line
      if (indent === 0) {
        if (bodyLines.length > 0) bodyLines.push('');
        bodyLines.push(text);
      } else {
        bodyLines.push(text);
      }
    } else if (line.trim()) {
      // Non-outline content (continuation lines)
      bodyLines.push(line.replace(/^\s{2}/, ''));
    }
  }

  // Check title for class-based cardType hints
  const classMatch = title.match(/^(Task|Idea|Person|Reference|Link|File):\s*/i);
  if (classMatch) {
    cardType = classMatch[1].toLowerCase();
  }

  return {
    title,
    cardType,
    visibility,
    bodyMarkdown: bodyLines.join('\n'),
    properties,
    tags,
    childTitles,
    attachmentPaths,
  };
}
