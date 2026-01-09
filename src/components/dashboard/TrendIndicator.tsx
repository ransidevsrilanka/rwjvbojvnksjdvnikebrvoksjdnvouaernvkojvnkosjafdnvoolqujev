import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const TrendIndicator = ({
  value,
  suffix = '%',
  showIcon = true,
  size = 'sm',
  className,
}: TrendIndicatorProps) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  
  const colorClass = isNeutral 
    ? 'text-muted-foreground bg-muted/50' 
    : isPositive 
      ? 'text-emerald-400 bg-emerald-500/10' 
      : 'text-red-400 bg-red-500/10';

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : 'text-sm px-2 py-1';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded font-medium",
      colorClass,
      sizeClasses,
      className
    )}>
      {showIcon && <Icon className={iconSize} />}
      {!isNeutral && (isPositive ? '+' : '')}{value}{suffix}
    </span>
  );
};

export default TrendIndicator;
