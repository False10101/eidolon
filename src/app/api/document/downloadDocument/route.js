
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core'; 
import chromium from '@sparticuz/chromium';
import { marked } from 'marked';

const PDF_STYLE = `...`; 

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

        const contentHtml = marked(mdText);

        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless, 
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
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
        // Force executable path update in case of an error
        await chromium.executablePath(true); 
        return NextResponse.json(
            { message: 'Failed to generate PDF.', error: error.message },
            { status: 500 }
        );
    }
}