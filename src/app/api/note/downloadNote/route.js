import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// ---------------------------------------------------------
//  THE FINAL "GOD-TIER" CSS
// ---------------------------------------------------------
const PDF_STYLE = `
  /* 1. PREMIUM TYPOGRAPHY IMPORT */
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    /* The "Midnight Pro" Palette */
    --c-ink: #0f172a;           /* Deepest Blue-Black */
    --c-subtle: #475569;        /* Slate text */
    --c-primary: #3b82f6;       /* Electric Blue */
    --c-accent: #8b5cf6;        /* Vivid Violet */
    --c-surface: #ffffff;       /* Pure White Paper */
    --c-surface-alt: #f8fafc;   /* Off-white sections */

    /* Code Block Colors (Light Mode) */
    --bg-code-block: #f8fafc;   /* Slate 50 */
    --bg-code-header: #f1f5f9;  /* Slate 100 */
    --border-code: #e2e8f0;     /* Slate 200 */
    
    --font-heading: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
    --font-code: 'JetBrains Mono', monospace;
    
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 18px;
  }

  /* 2. PAGE SETUP */
  @page {
    margin: 20mm 20mm 25mm 20mm;
    size: A4;
  }

  body {
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.75;
    color: var(--c-subtle);
    background: var(--c-surface);
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 3. TITLES & HEADERS */
  h1, h2, h3, h4 {
    font-family: var(--font-heading);
    color: var(--c-ink);
    margin-top: 2.5em;
    margin-bottom: 0.8em;
    position: relative;
    page-break-after: avoid;
  }

  h1 {
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.1;
    margin-top: 0;
    margin-bottom: 1.5em;
    padding-bottom: 0.5em;
    background: linear-gradient(to right, #0f172a, #475569);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    border-bottom: 1px solid #e2e8f0;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.03em;
    padding-left: 16px;
    border-left: 4px solid var(--c-primary);
  }

  h3 {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--c-subtle);
    display: flex;
    align-items: center;
  }
  
  h3::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-accent);
    margin-right: 10px;
    opacity: 0.6;
  }

  /* 4. THE "LIGHT LAB" CODE BLOCK (Wrapped & Density Optimized) */
  pre {
    background: var(--bg-code-block);
    color: #334155;
    padding: 3.5em 1.2em 1.2em 1.2em; 
    margin: 2.5em 0;
    border-radius: var(--radius-md);
    position: relative;
    border: 1px solid var(--border-code);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    page-break-inside: avoid;
    
    /* The Safety Wrap Logic */
    overflow-x: hidden; 
    white-space: pre-wrap;      
    word-wrap: break-word;
  }

  pre::before {
    content: "SCRIPT";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 34px;
    background: var(--bg-code-header);
    border-bottom: 1px solid var(--border-code);
    display: flex;
    align-items: center;
    padding-left: 60px;
    font-family: var(--font-heading);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #94a3b8;
  }

  pre::after {
    content: "";
    position: absolute;
    top: 11px;
    left: 14px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #cbd5e1;
    box-shadow: 16px 0 0 #cbd5e1, 32px 0 0 #cbd5e1;
  }

  code {
    font-family: var(--font-code);
    font-size: 11px;         
    line-height: 1.5;       
    letter-spacing: -0.3px;
    tab-size: 2;             
  }

  :not(pre) > code {
    font-size: 0.85em;
    background: #f1f5f9;
    color: var(--c-primary);
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-weight: 500;
    letter-spacing: normal;
  }

  /* 5. FLOATING INSIGHT CARDS */
  blockquote {
    position: relative;
    margin: 2.5em 0;
    padding: 1.5em 2em;
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    border: 1px solid #e2e8f0;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    page-break-inside: avoid;
  }

  blockquote::before {
    content: "NOTE";
    display: inline-block;
    background: var(--c-accent);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 1em;
    font-family: var(--font-heading);
    letter-spacing: 1px;
  }

  blockquote p {
    margin: 0;
    font-style: italic;
    color: var(--c-ink);
    font-weight: 500;
  }

  /* 6. TABLES */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 3em 0;
    font-size: 0.9em;
    page-break-inside: avoid;
  }

  th {
    text-align: left;
    padding: 16px;
    color: var(--c-subtle);
    font-family: var(--font-heading);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #cbd5e1;
  }

  td {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    color: var(--c-ink);
    background: #fff;
  }

  tr:last-child td { border-bottom: none; }

  /* 7. LISTS */
  ul { list-style: none; padding-left: 0; }
  li { position: relative; padding-left: 24px; margin-bottom: 10px; color: var(--c-subtle); }
  li::before { content: "→"; position: absolute; left: 0; color: var(--c-primary); font-weight: bold; }
  strong { color: var(--c-ink); font-weight: 600; }
  a { color: var(--c-primary); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }

  /* 8. IMAGES */
  img {
    display: block;
    max-width: 100%;
    margin: 3em auto;
    border-radius: var(--radius-sm);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    border: 1px solid #f1f5f9;
  }

  /* 9. DIVIDERS */
  hr {
    border: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, #cbd5e1, transparent);
    margin: 4em 0;
  }

  /* 10. SYNTAX HIGHLIGHTING (VS Code Light Theme) */
  .hljs-keyword, .hljs-operator, .hljs-selector-tag { color: #a626a4; font-weight: 500; }
  .hljs-built_in, .hljs-literal, .hljs-number { color: #986801; }
  .hljs-string, .hljs-attr { color: #50a14f; }
  .hljs-title, .hljs-function { color: #4078f2; }
  .hljs-title.class_ { color: #c18401; }
  .hljs-comment, .hljs-quote { color: #a0a1a7; font-style: italic; }
  .hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-name { color: #383a42; }
  .hljs-tag, .hljs-name, .hljs-attribute { color: #e45649; }
`;

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { mdText, fileName } = await req.json();

        if (!mdText) {
            return NextResponse.json({ message: 'Markdown content is required.' }, { status: 400 });
        }

        // ---------------------------------------------------------
        //  CONFIGURE MARKED WITH HIGHLIGHT.JS
        // ---------------------------------------------------------
        const marked = new Marked(
            markedHighlight({
                langPrefix: 'hljs language-',
                highlight(code, lang) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                }
            })
        );

        // Parse Markdown to HTML with syntax highlighting
        const contentHtml = marked.parse(mdText);

        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // WaitUntil 'networkidle0' ensures fonts are loaded
        await page.setContent(contentHtml, { waitUntil: 'networkidle0' });
        await page.addStyleTag({ content: PDF_STYLE });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const downloadFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${downloadFileName}"`,
            },
        });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        await chromium.executablePath(true); // Attempt to fix path on error
        return NextResponse.json(
            { message: 'Failed to generate PDF.', error: error.message },
            { status: 500 }
        );
    }
}