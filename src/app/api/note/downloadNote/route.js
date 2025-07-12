// app/api/note/generate-pdf/route.js

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

// A single, clean style that will be applied to all PDF downloads
const PDF_STYLE = `
  body { 
    font-family: "Segoe UI", "Helvetica Neue", "Arial", sans-serif; 
    font-size: 15px; 
    line-height: 1.75; 
    color: #111; 
    background-color: white; 
    padding: 3em; 
    max-width: 800px; 
    margin: auto; 
  }
  h1, h2, h3, h4, h5, h6 { 
    font-weight: 700; 
    color: #2c3e50; 
    margin-top: 2em; 
    margin-bottom: 1em; 
    border-bottom: 1px solid #eee; 
    padding-bottom: 0.2em;
  }
  p { margin: 1em 0; }
  code { 
    font-family: "Courier New", monospace; 
    background-color: #f5f5f5; 
    padding: 0.2em 0.4em; 
    font-size: 0.9em; 
    border-radius: 4px; 
  }
  pre { 
    background-color: #f5f5f5; 
    padding: 1em; 
    border-radius: 5px; 
    white-space: pre-wrap; 
    word-wrap: break-word; 
  }
  blockquote { 
    border-left: 4px solid #ccc; 
    padding-left: 1em; 
    color: #666; 
    font-style: italic; 
  }
  ul, ol { padding-left: 2em; }
  a { color: #007acc; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

export async function POST(request) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        // 1. Get only the necessary data from the request body
        const { mdText, fileName } = await request.json();

        if (!mdText) {
            return NextResponse.json({ message: 'Markdown content is required.' }, { status: 400 });
        }

        // 2. Convert Markdown to HTML
        const contentHtml = marked(mdText);

        // 3. Use Puppeteer to create the PDF
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        // Set content and inject our single, standard style
        await page.setContent(contentHtml, { waitUntil: 'networkidle0' });
        await page.addStyleTag({ content: PDF_STYLE });
        
        // Generate the PDF buffer
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 4. Create and return the PDF response
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
        return NextResponse.json(
            { message: 'Failed to generate PDF.', error: error.message },
            { status: 500 }
        );
    }
}