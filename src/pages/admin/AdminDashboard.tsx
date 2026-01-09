import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  TrendingUp,
  LogOut,
  Crown,
  DollarSign,
  Trash2,
  RefreshCw,
  HardDrive,
  Database,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/dashboard/StatCard';
import { MiniChart } from '@/components/dashboard/MiniChart';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { format } from 'date-fns';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';

interface Stats {
  totalStudents: number;
  totalCreators: number;
  activeEnrollments: number;
  totalCodes: number;
  activeCodes: number;
  totalSubjects: number;
  pendingUpgrades: number;
  pendingJoinRequests: number;
  pendingWithdrawals: number;
  pendingHeadOpsRequests: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  starterCount: number;
  standardCount: number;
  lifetimeCount: number;
  cardPayments: number;
  bankPayments: number;
  currentPhase: number;
  phaseName: string;
}

interface TopCreator {
  id: string;
  display_name: string;
  referral_code: string;
  lifetime_paid_users: number;
  revenue: number;
}

// Storage Usage Component
const StorageUsageCard = () => {
  const [storageUsed, setStorageUsed] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStorageStats = async () => {
      try {
        const { data: notesFiles, error: notesError } = await supabase.storage
          .from('notes')
          .list('', { limit: 1000 });

        const { data: contentFiles, error: contentError } = await supabase.storage
          .from('content')
          .list('', { limit: 1000 });

        let totalSize = 0;
        let totalFiles = 0;

        if (notesFiles && !notesError) {
          totalFiles += notesFiles.length;
          totalSize += notesFiles.length * 5;
        }

        if (contentFiles && !contentError) {
          totalFiles += contentFiles.length;
          totalSize += contentFiles.length * 5;
        }

        setStorageUsed(totalSize);
        setFileCount(totalFiles);
      } catch (error) {
        console.error('Error fetching storage stats:', error);
      }
      setIsLoading(false);
    };

    fetchStorageStats();
  }, []);

  const estimatedQuota = 1024;
  const usagePercent = Math.min((storageUsed / estimatedQuota) * 100, 100);

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-purple-400" />
        Storage Usage (Estimated)
      </h3>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">{storageUsed} MB</p>
              <p className="text-xs text-muted-foreground">of ~{estimatedQuota} MB estimated</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-foreground">{fileCount}</p>
              <p className="text-xs text-muted-foreground">files stored</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={usagePercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usagePercent.toFixed(1)}% used</span>
              <span>{estimatedQuota - storageUsed} MB remaining</span>
            </div>
          </div>

          {usagePercent > 80 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
              <p className="text-xs text-amber-400">
                ⚠️ Storage is running low. Consider upgrading or using external storage like Cloudflare R2.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            💡 For large files (50MB+), consider <strong>Cloudflare R2</strong> for cost-effective storage.
          </p>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalCreators: 0,
    activeEnrollments: 0,
    totalCodes: 0,
    activeCodes: 0,
    totalSubjects: 0,
    pendingUpgrades: 0,
    pendingJoinRequests: 0,
    pendingWithdrawals: 0,
    pendingHeadOpsRequests: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    starterCount: 0,
    standardCount: 0,
    lifetimeCount: 0,
    cardPayments: 0,
    bankPayments: 0,
    currentPhase: 1,
    phaseName: 'Phase 1',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{ name: string; value: number }[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const { data: nonStudentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin', 'content_admin', 'support_admin', 'creator', 'cmo']);
      
      const nonStudentUserIds = new Set((nonStudentRoles || []).map(r => r.user_id));

      const [
        { data: allEnrollments },
        { count: activeEnrollments },
        { count: totalCodes },
        { count: activeCodes },
        { count: totalSubjects },
        { count: pendingUpgrades },
        { count: pendingJoinRequests },
        { count: pendingWithdrawals },
        { count: pendingHeadOpsRequests },
        { count: totalCreators },
        { data: enrollmentTiers },
        { data: businessPhase },
      ] = await Promise.all([
        supabase.from('enrollments').select('user_id').eq('is_active', true),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }),
        supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('head_ops_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('tier').eq('is_active', true),
        supabase.from('business_phases').select('*').limit(1).maybeSingle(),
      ]);

      const totalStudents = (allEnrollments || []).filter(
        e => !nonStudentUserIds.has(e.user_id)
      ).length;

      const starterCount = (enrollmentTiers || []).filter(e => e.tier === 'starter').length;
      const standardCount = (enrollmentTiers || []).filter(e => e.tier === 'standard').length;
      const lifetimeCount = (enrollmentTiers || []).filter(e => e.tier === 'lifetime').length;

      const { data: allPayments } = await supabase
        .from('payment_attributions')
        .select('final_amount, payment_month, payment_type');

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const cardPayments = (allPayments || [])
        .filter(p => p.payment_type === 'card')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
      const bankPayments = (allPayments || [])
        .filter(p => p.payment_type === 'bank')
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const currentMonth = new Date();
      currentMonth.setDate(1);
      const currentMonthStr = currentMonth.toISOString().split('T')[0];
      const thisMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      const lastMonthRevenue = (allPayments || [])
        .filter(p => p.payment_month && p.payment_month >= lastMonthStr && p.payment_month < currentMonthStr)
        .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

      const monthlyRevenue: { [key: string]: number } = {};
      const monthlyEnrollments: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyRevenue[monthKey] = 0;
        monthlyEnrollments[monthKey] = 0;
      }

      (allPayments || []).forEach(p => {
        if (p.payment_month) {
          const monthKey = p.payment_month.slice(0, 7);
          if (monthlyRevenue.hasOwnProperty(monthKey)) {
            monthlyRevenue[monthKey] += Number(p.final_amount || 0);
            monthlyEnrollments[monthKey] += 1;
          }
        }
      });

      const chartData = Object.entries(monthlyRevenue).map(([key, value]) => {
        const date = new Date(key + '-01');
        return {
          name: date.toLocaleDateString('en-US', { month: 'short' }),
          value,
        };
      });

      const enrollmentChartData = Object.entries(monthlyEnrollments).map(([key, value]) => {
        const date = new Date(key + '-01');
        return {
          name: date.toLocaleDateString('en-US', { month: 'short' }),
          value,
        };
      });

      setRevenueData(chartData);
      setEnrollmentData(enrollmentChartData);

      const { data: creatorsData } = await supabase
        .from('creator_profiles')
        .select('id, display_name, referral_code, lifetime_paid_users')
        .order('lifetime_paid_users', { ascending: false })
        .limit(5);

      if (creatorsData && creatorsData.length > 0) {
        const creatorsWithRevenue = await Promise.all(
          creatorsData.map(async (creator) => {
            const { data: creatorPayments } = await supabase
              .from('payment_attributions')
              .select('final_amount')
              .eq('creator_id', creator.id);
            
            const revenue = (creatorPayments || []).reduce(
              (sum, p) => sum + Number(p.final_amount || 0), 0
            );
            
            return { ...creator, revenue };
          })
        );
        setTopCreators(creatorsWithRevenue);
      }

      setStats({
        totalStudents,
        totalCreators: totalCreators || 0,
        activeEnrollments: activeEnrollments || 0,
        totalCodes: totalCodes || 0,
        activeCodes: activeCodes || 0,
        totalSubjects: totalSubjects || 0,
        pendingUpgrades: pendingUpgrades || 0,
        pendingJoinRequests: pendingJoinRequests || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingHeadOpsRequests: pendingHeadOpsRequests || 0,
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        starterCount,
        standardCount,
        lifetimeCount,
        cardPayments,
        bankPayments,
        currentPhase: businessPhase?.current_phase || 1,
        phaseName: businessPhase?.phase_name || 'Phase 1',
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        toast.error('Not authenticated');
        setIsClearing(false);
        return;
      }

      const response = await supabase.functions.invoke('admin-purge-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Purge failed');
      }

      toast.success('All user data, stats, and creator accounts cleared. Admin & CMO accounts preserved.');
      fetchStats();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data: ' + error.message);
    }
    setIsClearing(false);
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('admin-payments-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payment_attributions' },
        () => {
          console.log('Payment attribution change detected, refreshing stats...');
          fetchStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          console.log('Payment change detected, refreshing stats...');
          fetchStats();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const revenueTrend = stats.lastMonthRevenue > 0 
    ? Math.round(((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100) 
    : 0;

  const tierDistributionData = [
    { name: 'Starter', value: stats.starterCount },
    { name: 'Standard', value: stats.standardCount },
    { name: 'Lifetime', value: stats.lifetimeCount },
  ];

  const paymentMethodData = [
    { name: 'Card', value: stats.cardPayments },
    { name: 'Bank', value: stats.bankPayments },
  ];

  const statCards = [
    { 
      label: 'Total Revenue', 
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign,
      iconColor: 'amber' as const,
      trend: revenueTrend !== 0 ? { value: Math.abs(revenueTrend), isPositive: revenueTrend > 0 } : undefined,
    },
    { 
      label: 'This Month', 
      value: `Rs. ${stats.thisMonthRevenue.toLocaleString()}`, 
      icon: TrendingUp,
      iconColor: 'green' as const,
      subtitle: stats.lastMonthRevenue > 0 ? `Last: Rs. ${stats.lastMonthRevenue.toLocaleString()}` : undefined,
    },
    { 
      label: 'Total Creators', 
      value: stats.totalCreators, 
      icon: Users,
      iconColor: 'purple' as const,
    },
    { 
      label: 'Total Students', 
      value: stats.totalStudents, 
      icon: Users,
      iconColor: 'blue' as const,
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar stats={stats} />
        <AdminCommandPalette />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground">CEO Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {format(lastUpdated, 'h:mm a')}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6 space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  Revenue (Last 6 Months)
                </h3>
                <MiniChart data={revenueData} colors={['#f59e0b']} height={180} />
              </div>

              {/* Enrollments Chart */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  New Enrollments (Last 6 Months)
                </h3>
                <MiniChart data={enrollmentData} colors={['#3b82f6']} height={180} />
              </div>
            </div>

            {/* Tier & Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tier Distribution */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-gold" />
                  Tier Distribution
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <ProgressRing
                    progress={stats.activeEnrollments > 0 ? (stats.lifetimeCount / stats.activeEnrollments) * 100 : 0}
                    size={120}
                    strokeWidth={12}
                    color="hsl(var(--gold))"
                    label="Lifetime"
                  />
                </div>
                <ChartLegend
                  items={[
                    { name: 'Starter', value: stats.starterCount, color: 'bg-muted-foreground' },
                    { name: 'Standard', value: stats.standardCount, color: 'bg-brand' },
                    { name: 'Lifetime', value: stats.lifetimeCount, color: 'bg-gold' },
                  ]}
                />
              </div>

              {/* Payment Methods */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-400" />
                  Payment Methods
                </h3>
                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Card Payments</span>
                    <span className="font-medium text-foreground">Rs. {stats.cardPayments.toLocaleString()}</span>
                  </div>
                  <Progress value={stats.totalRevenue > 0 ? (stats.cardPayments / stats.totalRevenue) * 100 : 0} className="h-2" />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted-foreground">Bank Transfers</span>
                    <span className="font-medium text-foreground">Rs. {stats.bankPayments.toLocaleString()}</span>
                  </div>
                  <Progress value={stats.totalRevenue > 0 ? (stats.bankPayments / stats.totalRevenue) * 100 : 0} className="h-2" />
                </div>
              </div>

              {/* Storage Usage */}
              <StorageUsageCard />
            </div>

            {/* Top Creators */}
            {topCreators.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Top Creators
                </h3>
                <div className="space-y-3">
                  {topCreators.map((creator, index) => (
                    <div key={creator.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-foreground">{creator.display_name || creator.referral_code}</p>
                          <p className="text-xs text-muted-foreground">{creator.lifetime_paid_users} paid users</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">Rs. {creator.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="glass-card p-6 border-destructive/30">
              <h3 className="font-semibold text-destructive mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clear all user data, payment records, and creator accounts. Admin and CMO accounts will be preserved.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isClearing}>
                    {isClearing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all user accounts, enrollments, payments, and creator data. Only admin and CMO accounts will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground">
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
