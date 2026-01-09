import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  backLink?: string;
  rightContent?: React.ReactNode;
}

export const DashboardHeader = ({
  title,
  subtitle,
  badge,
  badgeColor = 'bg-muted text-foreground',
  userName,
  userEmail,
  onSignOut,
  backLink,
  rightContent,
}: DashboardHeaderProps) => {
  return (
    <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backLink && (
              <Link to={backLink} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-xl font-bold text-foreground">
                  {title}
                </h1>
                {badge && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-muted-foreground text-sm">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {rightContent}
            {(userName || userEmail) && (
              <span className="text-muted-foreground text-sm hidden sm:block">
                {userName || userEmail}
              </span>
            )}
            {onSignOut && (
              <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
