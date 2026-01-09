import React from 'react';
import { FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PDFLoadingStateProps {
  progress: number;
}

export const PDFLoadingState: React.FC<PDFLoadingStateProps> = ({ progress }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <FileText className="w-8 h-8 text-primary animate-pulse" />
      </div>
      
      <h3 className="text-lg font-medium mb-2">Loading Document</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Please wait while the document loads...
      </p>
      
      <div className="w-64">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {progress}%
        </p>
      </div>
    </div>
  );
};
