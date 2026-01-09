import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Key,
  BookOpen,
  Shield,
  DollarSign,
  Crown,
  Palette,
  BarChart3,
  Wallet,
  GitCompare,
  Settings,
  Target,
  FileCheck,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  CreditCard,
  Brain,
  Layers,
} from 'lucide-react';

interface AdminSidebarProps {
  stats: {
    pendingJoinRequests: number;
    pendingUpgrades: number;
    pendingWithdrawals: number;
    pendingHeadOpsRequests: number;
  };
}

const AdminSidebar = ({ stats }: AdminSidebarProps) => {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, badge: 0 },
      ],
    },
    {
      label: 'Requests',
      items: [
        { label: 'Join Requests', href: '/admin/join-requests', icon: Users, badge: stats.pendingJoinRequests },
        { label: 'Upgrade Requests', href: '/admin/upgrades', icon: Crown, badge: stats.pendingUpgrades },
        { label: 'Withdrawals', href: '/admin/withdrawals', icon: Wallet, badge: stats.pendingWithdrawals },
        { label: 'Head Ops Requests', href: '/admin/headops-requests', icon: FileCheck, badge: stats.pendingHeadOpsRequests },
      ],
    },
    {
      label: 'Content',
      items: [
        { label: 'Subjects & Notes', href: '/admin/content', icon: BookOpen, badge: 0 },
        { label: 'Question Bank', href: '/admin/content?tab=questions', icon: Brain, badge: 0 },
        { label: 'Quizzes', href: '/admin/content?tab=quizzes', icon: Layers, badge: 0 },
      ],
    },
    {
      label: 'Users',
      items: [
        { label: 'Enrollments', href: '/admin/enrollments', icon: Users, badge: 0 },
        { label: 'Access Codes', href: '/admin/codes', icon: Key, badge: 0 },
        { label: 'Messages', href: '/admin/messages', icon: MessageSquare, badge: 0 },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Payments', href: '/admin/payments', icon: CreditCard, badge: 0 },
        { label: 'Reconciliation', href: '/admin/reconciliation', icon: GitCompare, badge: 0 },
        { label: 'Commission Settings', href: '/admin/commission-settings', icon: Target, badge: 0 },
        { label: 'Referral Analytics', href: '/admin/analytics', icon: BarChart3, badge: 0 },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Pricing', href: '/admin/pricing', icon: DollarSign, badge: 0 },
        { label: 'Branding', href: '/admin/branding', icon: Palette, badge: 0 },
        { label: 'Payment Settings', href: '/admin/payment-settings', icon: Settings, badge: 0 },
        { label: 'Security', href: '/admin/security', icon: Shield, badge: 0 },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-foreground group-data-[collapsible=icon]:hidden">
            CEO Panel
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin' && location.pathname.startsWith(item.href.split('?')[0]));
                  
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.href} className="relative">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {item.badge > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-auto h-5 min-w-5 px-1 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AdminSidebar;
