import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  MessageSquare,
  CreditCard,
  Brain,
  Layers,
} from 'lucide-react';

const AdminCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Win+/ or Cmd+/ or Ctrl+K
      if ((e.key === '/' && (e.metaKey || e.ctrlKey)) || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const commands = [
    {
      group: 'Dashboard',
      items: [
        { label: 'Dashboard Home', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Requests',
      items: [
        { label: 'Join Requests', href: '/admin/join-requests', icon: Users },
        { label: 'Upgrade Requests', href: '/admin/upgrades', icon: Crown },
        { label: 'Withdrawal Requests', href: '/admin/withdrawals', icon: Wallet },
        { label: 'Head Ops Requests', href: '/admin/headops-requests', icon: FileCheck },
      ],
    },
    {
      group: 'Content Management',
      items: [
        { label: 'Subjects & Notes', href: '/admin/content', icon: BookOpen },
        { label: 'Question Bank', href: '/admin/content?tab=questions', icon: Brain },
        { label: 'Quizzes', href: '/admin/content?tab=quizzes', icon: Layers },
      ],
    },
    {
      group: 'Users',
      items: [
        { label: 'View Enrollments', href: '/admin/enrollments', icon: Users },
        { label: 'Access Codes', href: '/admin/codes', icon: Key },
        { label: 'Send Messages', href: '/admin/messages', icon: MessageSquare },
      ],
    },
    {
      group: 'Finance',
      items: [
        { label: 'View Payments', href: '/admin/payments', icon: CreditCard },
        { label: 'Payment Reconciliation', href: '/admin/reconciliation', icon: GitCompare },
        { label: 'Commission Settings', href: '/admin/commission-settings', icon: Target },
        { label: 'Referral Analytics', href: '/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'Settings',
      items: [
        { label: 'Pricing Settings', href: '/admin/pricing', icon: DollarSign },
        { label: 'Branding Settings', href: '/admin/branding', icon: Palette },
        { label: 'Payment Settings', href: '/admin/payment-settings', icon: Settings },
        { label: 'Security & Abuse', href: '/admin/security', icon: Shield },
      ],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search admin pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group, groupIndex) => (
          <div key={group.group}>
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {groupIndex < commands.length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default AdminCommandPalette;
