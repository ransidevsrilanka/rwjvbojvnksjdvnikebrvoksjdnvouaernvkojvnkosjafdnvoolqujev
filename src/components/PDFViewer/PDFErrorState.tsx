import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface PDFErrorStateProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

export const PDFErrorState: React.FC<PDFErrorStateProps> = ({ message, details, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      
      <h3 className="text-lg font-medium mb-2">Unable to Load Document</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {message}
      </p>

      {details && (
        <details className="w-full max-w-2xl text-left mb-6">
          <summary className="cursor-pointer text-sm text-muted-foreground select-none">
            Technical details
          </summary>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 text-xs text-foreground/90">
{details}
          </pre>
        </details>
      )}
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
};
