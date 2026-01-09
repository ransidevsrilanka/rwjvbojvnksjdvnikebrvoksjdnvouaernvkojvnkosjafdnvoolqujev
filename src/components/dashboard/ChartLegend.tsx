import { cn } from '@/lib/utils';

interface LegendItem {
  name: string;
  color: string;
  value?: number | string;
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export const ChartLegend = ({
  items,
  className,
  layout = 'horizontal',
}: ChartLegendProps) => {
  return (
    <div className={cn(
      "flex gap-4",
      layout === 'vertical' ? 'flex-col gap-2' : 'flex-wrap',
      className
    )}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm flex-shrink-0" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.name}</span>
          {item.value !== undefined && (
            <span className="text-xs font-medium text-foreground">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChartLegend;
