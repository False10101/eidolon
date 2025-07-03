'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// This is the modern, recommended way to set up the worker.
// It uses the version of pdfjs-dist that is installed with react-pdf
// and does not require a postinstall script or copying files.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfViewer({ file }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Set up a resize observer to get the container's dimensions for responsive scaling
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);


  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1); // Go to first page when a new PDF is loaded
  }

  const goToPrevPage = () =>
    setPageNumber(prevPageNumber => (prevPageNumber - 1 <= 1 ? 1 : prevPageNumber - 1));

  const goToNextPage = () =>
    setPageNumber(prevPageNumber => (prevPageNumber + 1 >= numPages ? numPages : prevPageNumber + 1));

  return (
    <div className="bg-[#1A1D2C]/[30%] w-full h-full rounded-t-xl border-2 border-white/[10%] flex flex-col items-center justify-center p-4 relative"
         onMouseEnter={() => setIsHovering(true)}
         onMouseLeave={() => setIsHovering(false)}
    >
      
      {/* This wrapper div is used for sizing the PDF viewer area. */}
      {/* The ref is used to get its dimensions for the responsive Page component. */}
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="bg-[#000000]/[30%] flex justify-center items-center h-full"
          loading="Loading PDF..."
          error="Failed to load PDF."
        >
          {/* We pass the container's height to the Page component to make it fit vertically */}
          {containerSize.height > 0 && (
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={true} 
              renderAnnotationLayer={true}
              height={containerSize.height}
            />
          )}
        </Document>
      </div>
      
      {numPages > 0 && (
        <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 transition-opacity duration-300 z-10 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center text-white space-x-4 bg-blue-950/40 backdrop-blur-sm py-1 px-3 rounded-xl">
            <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 rounded-full hover:bg-white/20 disabled:text-gray-500 disabled:hover:bg-transparent transition-colors">
              <ChevronLeftIcon className='w-5 h-5'/>
            </button>
            <span>
              Page {pageNumber} of {numPages}
            </span>
            <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="p-2 rounded-full hover:bg-white/20 disabled:text-gray-500 disabled:hover:bg-transparent transition-colors">
              <ChevronRightIcon className='w-5 h-5'/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}