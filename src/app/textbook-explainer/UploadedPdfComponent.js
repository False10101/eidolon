'use client';

import { useState, useCallback } from 'react';
import { Document, pdfjs } from 'react-pdf';

// Import the CSS for react-pdf to prevent potential rendering issues
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';




// Configure the worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();


export default function UploadedPdfComponent({ uploadedFile, setIsProcessing, setExtractedText, setExtractionError }) {

    const onDocumentLoadSuccess = useCallback(async (pdf) => {
        setIsProcessing(true);
        setExtractedText(''); // Clear previous results

        const results = [];
        const numPages = pdf.numPages;

        try {
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);

                // ✅ FIX: Call getTextContent() on the 'page' object, not the 'pdf' object.
                const textContent = await page.getTextContent();

                let slideOutput = `[Slide ${i}]\n`;

                const text = textContent.items.map((item) => item.str).join(' ').trim();

                if (text) {
                    slideOutput += text;
                } else {
                    slideOutput += "(No readable text found on this slide)";
                }

                results.push(slideOutput + "\n\n");
            }

            setExtractedText(results.join(''));
        } catch (error) {
            console.error("Error during text extraction:", error);
            setExtractionError("Failed to extract text from the PDF.");
        } finally {
            setIsProcessing(false);
        }
    }, [setIsProcessing, setExtractedText, setExtractionError]);


    const onDocumentLoadError = (err) => {
        console.error("Error loading PDF:", err.message);
        setExtractionError("Failed to load the PDF. Please ensure it's a valid file.");
        setIsProcessing(false);
    };

    return (
        <div style={{ display: 'none' }}>
      {uploadedFile && (
        <Document
          file={uploadedFile}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        />
      )}
    </div>
    )
}