// Extract N brace-balanced arguments starting at index `pos` in `str`
function extractArgs(str: string, pos: number, count: number): { args: string[]; end: number } {
  const args: string[] = [];
  let i = pos;
  while (args.length < count && i < str.length) {
    // Skip whitespace/newlines between args
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str[i] !== '{') break;
    // Find matching closing brace
    let depth = 0;
    const start = i;
    for (; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    args.push(str.slice(start + 1, i - 1));
  }
  return { args, end: i };
}

// Replace all occurrences of a command with N args using a replacer function
function replaceCmd(
  str: string,
  cmd: string,
  argCount: number,
  replacer: (...args: string[]) => string
): string {
  const pattern = new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g');
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(str)) !== null) {
    const { args, end } = extractArgs(str, match.index + match[0].length, argCount);
    if (args.length === argCount) {
      result += str.slice(lastIndex, match.index);
      result += replacer(...args);
      lastIndex = end;
      pattern.lastIndex = end;
    }
  }
  result += str.slice(lastIndex);
  return result;
}

export function latexToHtml(latex: string): string {
  if (!latex) return '<div class="preview-empty">No content to preview</div>';

  try {
    let html = latex;

    // Extract body content. If there's no document body, don't render the raw
    // preamble (that produces garbage like "#1 -2pt") — show a clear message.
    const bodyMatch = html.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (bodyMatch) {
      html = bodyMatch[1];
    } else if (html.includes('\\begin{document}')) {
      html = html.slice(html.indexOf('\\begin{document}') + '\\begin{document}'.length);
    } else {
      return '<div class="preview-error">Preview unavailable — the LaTeX is missing its document body (\\begin{document} … \\end{document}).</div>';
    }

    // Remove comments
    html = html.replace(/%[^\n]*/g, '');

    // ---- Heading / contact block ----
    let nameHtml = '';
    const centerMatch = html.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
    if (centerMatch) {
      const centerContent = centerMatch[1];
      // Extract name
      let processedCenter = centerContent;
      processedCenter = replaceCmd(processedCenter, 'textbf', 1, (inner) => {
        // Look for \Huge \scshape inside
        const nameInner = inner.replace(/\\Huge\s*/, '').replace(/\\scshape\s*/, '').trim();
        return `<h1 class="resume-name">${nameInner}</h1>`;
      });
      // Parse hrefs before stripping
      processedCenter = replaceCmd(processedCenter, 'href', 2, (url, text) => {
        const cleanText = replaceCmd(text, 'underline', 1, (t) => t);
        return `<a href="${url}">${cleanText}</a>`;
      });
      processedCenter = processedCenter.replace(/\$\s*\|\s*\$/g, '<span class="sep">|</span>');
      processedCenter = processedCenter.replace(/\\vspace\{[^}]*\}/g, '');
      processedCenter = processedCenter.replace(/\\small\s*/g, '');
      processedCenter = processedCenter.replace(/\\\\\s*/g, ' ');
      processedCenter = processedCenter.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
      processedCenter = processedCenter.replace(/\\[a-zA-Z]+\s*/g, '');

      // Split into name and contact
      const h1Match = processedCenter.match(/<h1[^>]*>.*?<\/h1>/);
      if (h1Match) {
        nameHtml = h1Match[0];
        const rest = processedCenter.slice(h1Match.index! + h1Match[0].length).trim();
        if (rest) nameHtml += `<p class="resume-contact">${rest}</p>`;
      } else {
        nameHtml = processedCenter;
      }
      html = html.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/, '');
    }

    // ---- List environments ----
    html = html.replace(/\\resumeSubHeadingListStart/g, '<ul class="subheading-list">');
    html = html.replace(/\\resumeSubHeadingListEnd/g, '</ul>');
    html = html.replace(/\\resumeItemListStart/g, '<ul class="item-list">');
    html = html.replace(/\\resumeItemListEnd/g, '</ul>');

    // ---- Commands with args (must come before generic stripping) ----
    html = replaceCmd(html, 'resumeSubheading', 4, (company, date, role, location) =>
      `<li class="subheading-item"><div class="subheading-row"><span class="company">${processInline(company)}</span><span class="date">${processInline(date)}</span></div><div class="subheading-row"><span class="role">${processInline(role)}</span><span class="location">${processInline(location)}</span></div>`
    );

    html = replaceCmd(html, 'resumeProjectHeading', 2, (title, date) =>
      `<li class="subheading-item"><div class="subheading-row"><span class="project-title">${processInline(title)}</span><span class="date">${processInline(date)}</span></div>`
    );

    html = replaceCmd(html, 'resumeSubSubheading', 2, (role, date) =>
      `<div class="subheading-row sub"><span class="role">${processInline(role)}</span><span class="date">${processInline(date)}</span></div>`
    );

    html = replaceCmd(html, 'resumeSubItem', 1, (content) =>
      `<li class="resume-item">${processInline(content)}</li>`
    );

    html = replaceCmd(html, 'resumeItem', 1, (content) =>
      `<li class="resume-item">${processInline(content)}</li>`
    );

    // ---- Sections ----
    html = replaceCmd(html, 'section', 1, (title) =>
      `</div><div class="resume-section"><h2 class="section-title">${escapeHtml(title)}</h2><hr class="section-rule"/>`
    );

    // ---- itemize ----
    html = html.replace(/\\begin\{itemize\}(?:\[[^\]]*\])?/g, '<ul class="item-list">');
    html = html.replace(/\\end\{itemize\}/g, '</ul>');
    html = html.replace(/\\item\s*/g, '<li class="resume-item">');

    // ---- tabular ----
    html = html.replace(/\\begin\{tabular\*\}[\s\S]*?\\end\{tabular\*\}/g, (match) => {
      const inner = match
        .replace(/\\begin\{tabular\*\}[^\n]*/g, '')
        .replace(/\\end\{tabular\*\}/g, '')
        .replace(/\\\\/g, '<br/>')
        .replace(/&/g, ' ');
      return `<div class="tabular">${processInline(inner)}</div>`;
    });

    // ---- Inline formatting pass ----
    html = processInline(html);

    // ---- Clean up remaining LaTeX ----
    html = html.replace(/\\vspace\{[^}]*\}/g, '');
    html = html.replace(/\\hspace\{[^}]*\}/g, '');
    html = html.replace(/\\begin\{[^}]*\}/g, '');
    html = html.replace(/\\end\{[^}]*\}/g, '');
    html = html.replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?\{[^}]*\}/g, '');
    html = html.replace(/\\[a-zA-Z]+\*?\s/g, '');
    html = html.replace(/\\\\/g, '<br/>');
    // Strip stray leftover braces (e.g. from \small{\item{ ... }} skills wrappers)
    html = html.replace(/[{}]/g, '');

    return `
      <div class="resume-doc">
        <div class="resume-header">${nameHtml}</div>
        <div class="resume-body"><div>${html}</div></div>
      </div>
    `;
  } catch {
    return `<div class="preview-error">Preview unavailable — LaTeX parsing error</div>`;
  }
}

function processInline(text: string): string {
  text = replaceCmd(text, 'textbf', 1, (c) => `<strong>${c}</strong>`);
  text = replaceCmd(text, 'textit', 1, (c) => `<em>${c}</em>`);
  text = replaceCmd(text, 'emph', 1, (c) => `<em>${c}</em>`);
  text = replaceCmd(text, 'underline', 1, (c) => `<u>${c}</u>`);
  text = replaceCmd(text, 'href', 2, (url, label) => {
    const cleanLabel = replaceCmd(label, 'underline', 1, (t) => t);
    return `<a href="${url}">${cleanLabel}</a>`;
  });
  text = replaceCmd(text, 'small', 1, (c) => `<span class="small">${c}</span>`);
  // math separators
  text = text.replace(/\$\s*\|\s*\$/g, '<span class="sep">|</span>');
  text = text.replace(/\$[^$]*\$/g, '');
  // special chars
  text = text.replace(/\\&/g, '&amp;');
  text = text.replace(/---/g, '—');
  text = text.replace(/--/g, '–');
  text = text.replace(/``(.*?)''/g, '“$1”');
  // strip remaining commands
  text = replaceCmd(text, 'scshape', 0, () => '');
  text = text.replace(/\\scshape\s*/g, '');
  text = text.replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?\{([^}]*)\}/g, '$1');
  text = text.replace(/\\[a-zA-Z]+\*?\s*/g, '');
  return text;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
