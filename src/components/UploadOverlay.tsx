import { Loader2 } from 'lucide-react';

interface UploadOverlayProps {
  isVisible: boolean;
  message?: string;
}

const UploadOverlay = ({ isVisible, message = 'Uploading...' }: UploadOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium text-lg">{message}</p>
        <p className="text-muted-foreground text-sm mt-2">Please wait, do not close this page</p>
      </div>
    </div>
  );
};

export default UploadOverlay;
