import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X,
  FileText
} from 'lucide-react';

interface PDFControlsProps {
  noteTitle?: string | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClose: () => void;
}

export const PDFControls: React.FC<PDFControlsProps> = ({
  noteTitle,
  currentPage,
  totalPages,
  scale,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClose,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      {/* Left: Title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <h1 className="text-sm font-medium truncate">
          {noteTitle || 'Document'}
        </h1>
      </div>

      {/* Center: Navigation & Zoom */}
      <div className="flex items-center gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevPage}
            disabled={currentPage <= 1}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="px-2 text-sm font-medium min-w-[80px] text-center">
            {currentPage} / {totalPages || '...'}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNextPage}
            disabled={currentPage >= totalPages}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
            disabled={scale <= 0.5}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="px-2 text-sm font-medium min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomIn}
            disabled={scale >= 3}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onResetZoom}
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right: Close */}
      <div className="flex items-center justify-end flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onClose}
          title="Close viewer"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
