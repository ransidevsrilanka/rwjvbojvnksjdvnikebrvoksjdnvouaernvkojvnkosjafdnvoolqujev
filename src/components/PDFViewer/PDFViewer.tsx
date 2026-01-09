import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { cn } from '@/lib/utils';
import { PDFControls } from './PDFControls';
import { PDFWatermark } from './PDFWatermark';
import { PDFLoadingState } from './PDFLoadingState';
import { PDFErrorState } from './PDFErrorState';

// Use a locally bundled worker (avoid CDN fallback).
GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  url: string;
  watermark?: {
    fullName?: string;
    email: string;
    oderId: string;
    timestamp?: string;
    userId?: string;
  } | null;
  noteTitle?: string | null;
  currentPage: number;
  scale: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  onScaleChange: (scale: number) => void;
  onClose: () => void;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  watermark,
  noteTitle,
  currentPage,
  scale,
  onPageChange,
  onTotalPagesChange,
  onScaleChange,
  onClose,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Security: Prevent right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
    }

    return () => {
      if (container) {
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, []);

  // Security: Block keyboard shortcuts for printing/saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P (print), Ctrl+S (save), Ctrl+Shift+S (save as)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;

    const loadPDF = async () => {
      if (!url) return;

      try {
        setError(null);
        setErrorDetails(null);
        setLoadingProgress(0);

        const loadingTask = getDocument({
          url,
          // Disable text layer for security
          disableAutoFetch: false,
          disableStream: false,
        });

        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
          if (progress.total > 0) {
            setLoadingProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        };

        const pdfDoc = await loadingTask.promise;

        if (isCancelled) {
          pdfDoc.destroy();
          return;
        }

        pdfDocRef.current = pdfDoc;
        const numPages = pdfDoc.numPages;
        setTotalPages(numPages);
        onTotalPagesChange(numPages);

        // Adjust current page if it exceeds total
        if (currentPage > numPages) {
          onPageChange(1);
        }
      } catch (err) {
        // IMPORTANT: don't log the signed URL; only log the error.
        console.error('Error loading PDF (pdf.js):', {
          name: (err as any)?.name,
          message: (err as any)?.message,
          stack: (err as any)?.stack,
        });

        if (!isCancelled) {
          const details = String((err as any)?.stack || (err as any)?.message || err);
          setErrorDetails(details);
          setError('Failed to load document. Please try again.');
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [url, retryToken]);

  // Render current page
  const renderPage = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;

    if (!pdfDoc || !canvas || currentPage < 1 || currentPage > totalPages) {
      return;
    }

    // Cancel any ongoing render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    setIsRendering(true);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [currentPage, scale, totalPages]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current && totalPages > 0) {
      renderPage();
    }
  }, [renderPage, totalPages]);

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    onScaleChange(Math.min(scale + 0.25, 3));
  };

  const handleZoomOut = () => {
    onScaleChange(Math.max(scale - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    onScaleChange(1);
  };

  // SPA-safe retry: re-run pdf load without reloading the entire app.
  const handleRetry = useCallback(() => {
    setError(null);
    setErrorDetails(null);
    setLoadingProgress(0);
    setTotalPages(0);
    // Increment token to force the PDF load effect to re-run
    setRetryToken((t) => t + 1);
  }, []);

  if (error) {
    return (
      <PDFErrorState
        message={error}
        details={errorDetails || undefined}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50 bg-background flex flex-col select-none',
        className
      )}
      style={{
        // Prevent text selection
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Header with controls */}
      <PDFControls
        noteTitle={noteTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onClose={onClose}
      />

      {/* PDF Canvas Container */}
      <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
        {loadingProgress < 100 && totalPages === 0 ? (
          <PDFLoadingState progress={loadingProgress} />
        ) : (
          <div className="relative">
            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* Canvas with watermark overlay */}
            <div className="relative shadow-2xl">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto block"
                style={{
                  // Prevent saving/dragging
                  pointerEvents: 'none',
                }}
              />
              
              {/* Watermark overlay */}
              {watermark && (
                <PDFWatermark
                  fullName={watermark.fullName}
                  email={watermark.email}
                  oderId={watermark.oderId}
                  timestamp={watermark.timestamp}
                  userId={watermark.userId}
                />
              )}
              
              {/* Invisible overlay to capture events but block interaction */}
              <div 
                className="absolute inset-0"
                style={{ pointerEvents: 'auto' }}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden iframe blocker */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};
