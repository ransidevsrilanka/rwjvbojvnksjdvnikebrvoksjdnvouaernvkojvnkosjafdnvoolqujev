import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  timestamp: string;
  badge?: string;
  badgeColor?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export const ActivityFeed = ({
  items,
  className,
  emptyMessage = 'No recent activity',
  maxItems = 5,
}: ActivityFeedProps) => {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayItems.map((item) => (
        <div 
          key={item.id} 
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div 
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              item.iconColor || "bg-brand/20"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4",
              item.iconColor?.includes('green') ? 'text-green-500' : 
              item.iconColor?.includes('blue') ? 'text-blue-500' : 
              item.iconColor?.includes('purple') ? 'text-purple-500' : 
              'text-brand'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {item.title}
              </p>
              {item.badge && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  item.badgeColor || "bg-brand/20 text-brand"
                )}>
                  {item.badge}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.description}
              </p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {item.timestamp}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
