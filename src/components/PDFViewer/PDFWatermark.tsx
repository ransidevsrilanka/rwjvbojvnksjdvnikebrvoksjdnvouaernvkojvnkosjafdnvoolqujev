import React from 'react';

interface PDFWatermarkProps {
  fullName?: string;
  email: string;
  oderId: string;
  timestamp?: string;
  userId?: string;
}

export const PDFWatermark: React.FC<PDFWatermarkProps> = ({ 
  fullName, 
  email, 
  oderId, 
  timestamp,
  userId 
}) => {
  // Generate multiple watermark positions for thorough coverage
  const positions = [
    { top: '10%', left: '50%' },
    { top: '35%', left: '25%' },
    { top: '35%', left: '75%' },
    { top: '60%', left: '50%' },
    { top: '85%', left: '25%' },
    { top: '85%', left: '75%' },
  ];

  // Format timestamp for display
  const formattedTimestamp = timestamp 
    ? new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {positions.map((pos, index) => (
        <div
          key={index}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 -rotate-45"
          style={{
            top: pos.top,
            left: pos.left,
          }}
        >
          <div
            className="text-center whitespace-nowrap select-none"
            style={{
              color: 'rgba(120, 120, 120, 0.12)',
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textShadow: '0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            {fullName && <div className="font-semibold">{fullName}</div>}
            <div>{email}</div>
            <div className="text-[10px] mt-0.5">ID: {oderId}</div>
            {formattedTimestamp && (
              <div className="text-[10px] mt-0.5">{formattedTimestamp}</div>
            )}
          </div>
        </div>
      ))}
      
      {/* Additional diagonal pattern for extra security */}
      <div 
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 150px,
            rgba(100, 100, 100, 0.015) 150px,
            rgba(100, 100, 100, 0.015) 151px
          )`,
        }}
      />
    </div>
  );
};
