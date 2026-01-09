import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, LogIn, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PDFAccessDeniedProps {
  errorCode: string;
  onClose: () => void;
}

export const PDFAccessDenied: React.FC<PDFAccessDeniedProps> = ({ errorCode, onClose }) => {
  const navigate = useNavigate();

  const getErrorContent = () => {
    switch (errorCode) {
      case 'NOT_AUTHENTICATED':
      case 'NO_AUTH':
      case 'AUTH_FAILED':
        return {
          icon: LogIn,
          title: 'Sign In Required',
          description: 'Please sign in to access this content.',
          action: {
            label: 'Sign In',
            onClick: () => navigate('/auth'),
          },
        };

      case 'NO_ENROLLMENT':
        return {
          icon: Lock,
          title: 'Enrollment Required',
          description: 'You need an active enrollment to access this content. Activate your access code to get started.',
          action: {
            label: 'Activate Code',
            onClick: () => navigate('/activate'),
          },
        };

      case 'ENROLLMENT_EXPIRED':
        return {
          icon: Lock,
          title: 'Enrollment Expired',
          description: 'Your enrollment has expired. Please renew your access to continue viewing content.',
          action: {
            label: 'Get Access',
            onClick: () => navigate('/access'),
          },
        };

      case 'TIER_INSUFFICIENT':
        return {
          icon: Lock,
          title: 'Content Restricted',
          description: 'Your current plan does not include access to this content.',
          action: null,
        };

      default:
        return {
          icon: Lock,
          title: 'Access Restricted',
          description: 'You do not have permission to view this content.',
          action: null,
        };
    }
  };

  const content = getErrorContent();
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-md w-full bg-card rounded-xl border border-border p-8 text-center shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-3">{content.title}</h2>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          {content.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {content.action && (
            <Button onClick={content.action.onClick} className="w-full">
              {content.action.label}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
