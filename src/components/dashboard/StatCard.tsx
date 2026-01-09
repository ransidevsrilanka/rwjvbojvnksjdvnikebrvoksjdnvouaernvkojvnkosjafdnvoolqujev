import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: { value: number }[];
  subtitle?: string;
  iconColor?: 'default' | 'green' | 'amber' | 'blue' | 'purple' | 'red';
  className?: string;
}

// Format large numbers with abbreviations
const formatValue = (value: string | number): string => {
  if (typeof value === 'string') return value;
  
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) {
    return value.toLocaleString();
  }
  return value.toString();
};

const iconColorClasses = {
  default: 'bg-muted/50 text-foreground/80',
  green: 'bg-emerald-500/20 text-emerald-500',
  amber: 'bg-amber-500/20 text-amber-500',
  blue: 'bg-blue-500/20 text-blue-500',
  purple: 'bg-purple-500/20 text-purple-500',
  red: 'bg-red-500/20 text-red-500',
};

export const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  sparklineData,
  subtitle,
  iconColor = 'default',
  className 
}: StatCardProps) => {
  const displayValue = typeof value === 'number' && value > 999999 
    ? formatValue(value) 
    : typeof value === 'number' 
      ? value.toLocaleString() 
      : value;

  return (
    <div className={cn(
      "glass-card p-5 transition-all hover:border-border/60",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          iconColorClasses[iconColor]
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-bold text-foreground tracking-tight",
            displayValue.length > 12 ? "text-xl" : "text-2xl"
          )}>
            {displayValue}
          </p>
          <p className="text-muted-foreground text-sm mt-1">{label}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-16 h-8 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--brand))" 
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
