import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  Plus,
  Tag,
  Calendar,
  Award,
  UserPlus,
  Target,
  CheckCircle2,
  Circle,
  BarChart3,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { TrendIndicator } from '@/components/dashboard/TrendIndicator';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import InboxButton from '@/components/inbox/InboxButton';

interface CMOProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface CreatorWithStats {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string;
  lifetime_paid_users: number;
  available_balance: number | null;
  is_active: boolean | null;
  created_at: string;
  discount_codes: { code: string; paid_conversions: number }[];
  monthly_paid_users: number;
  commission_rate: number;
}

interface Stats {
  totalCreators: number;
  totalPaidUsersThisMonth: number;
  totalRevenueGenerated: number;
  annualPaidUsers: number;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  description: string;
}

interface MonthlyData {
  month: string;
  creators: number;
  paid_users: number;
  revenue: number;
}

const CMODashboard = () => {
  const { user, profile, isCMO, signOut } = useAuth();
  const navigate = useNavigate();
  const [cmoProfile, setCmoProfile] = useState<CMOProfile | null>(null);
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCreators: 0,
    totalPaidUsersThisMonth: 0,
    totalRevenueGenerated: 0,
    annualPaidUsers: 0,
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
  // Discount code creation
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [newCodeValue, setNewCodeValue] = useState('');
  const [isAutoGenerate, setIsAutoGenerate] = useState(true);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isCMO) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isCMO, navigate, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch CMO profile
      const { data: cmoData, error: cmoError } = await supabase
        .from('cmo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cmoError) throw cmoError;

      if (cmoData) {
        setCmoProfile(cmoData);

        // Fetch creators under this CMO
        const { data: creatorsData } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('cmo_id', cmoData.id)
          .order('lifetime_paid_users', { ascending: false });

        if (creatorsData) {
          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);

          const creatorIds = creatorsData.map(c => c.id);

          // Batch fetch discount codes
          const { data: allDiscountCodes } = await supabase
            .from('discount_codes')
            .select('id, code, paid_conversions, creator_id')
            .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);

          // Batch fetch monthly payment counts
          const { data: monthlyPayments } = await supabase
            .from('payment_attributions')
            .select('creator_id')
            .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000'])
            .gte('created_at', currentMonth.toISOString());

          // Batch fetch total revenue
          const { data: allPayments } = await supabase
            .from('payment_attributions')
            .select('creator_id, final_amount')
            .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);

          // Aggregate monthly counts per creator
          const monthlyCountsByCreator: Record<string, number> = {};
          (monthlyPayments || []).forEach(p => {
            monthlyCountsByCreator[p.creator_id] = (monthlyCountsByCreator[p.creator_id] || 0) + 1;
          });

          // Map creators with stats
          const creatorsWithStats: CreatorWithStats[] = creatorsData.map(creator => ({
            ...creator,
            lifetime_paid_users: creator.lifetime_paid_users || 0,
            discount_codes: (allDiscountCodes || [])
              .filter(dc => dc.creator_id === creator.id)
              .map(dc => ({ code: dc.code, paid_conversions: dc.paid_conversions || 0 })),
            monthly_paid_users: monthlyCountsByCreator[creator.id] || 0,
            commission_rate: (creator.lifetime_paid_users || 0) >= 500 ? 0.12 : 0.08,
          }));

          setCreators(creatorsWithStats);

          // Calculate stats
          const totalPaidThisMonth = Object.values(monthlyCountsByCreator).reduce((sum, count) => sum + count, 0);
          const totalRevenueGenerated = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

          // Get annual paid users
          const yearStart = new Date();
          yearStart.setMonth(0, 1);
          yearStart.setHours(0, 0, 0, 0);

          const { count: annualCount } = await supabase
            .from('payment_attributions')
            .select('*', { count: 'exact', head: true })
            .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000'])
            .gte('created_at', yearStart.toISOString());

          setStats({
            totalCreators: creatorsWithStats.length,
            totalPaidUsersThisMonth: totalPaidThisMonth,
            totalRevenueGenerated,
            annualPaidUsers: annualCount || 0,
          });

          // Fetch monthly data using RPC function
          const { data: monthlyRpcData, error: monthlyError } = await supabase
            .rpc('get_cmo_monthly_data', { 
              p_cmo_id: cmoData.id,
              p_months: 6 
            });

          if (!monthlyError && monthlyRpcData) {
            setMonthlyData(monthlyRpcData.map((m: any) => ({
              month: m.month,
              creators: Number(m.creators) || 0,
              paid_users: Number(m.paid_users) || 0,
              revenue: Number(m.revenue) || 0,
            })));
          }

          // Set goals
          const creatorCount = creatorsWithStats.length;
          const annualPaidUsers = annualCount || 0;

          setGoals([
            {
              id: '1',
              title: 'Get 5 active creators',
              target: 5,
              current: creatorCount,
              completed: creatorCount >= 5,
              description: 'Onboard your first 5 content creators',
            },
            {
              id: '2',
              title: 'Get 20 active creators',
              target: 20,
              current: creatorCount,
              completed: creatorCount >= 20,
              description: 'Build a solid creator base',
            },
            {
              id: '3',
              title: 'Get 100 active creators',
              target: 100,
              current: creatorCount,
              completed: creatorCount >= 100,
              description: 'Scale your creator network',
            },
            {
              id: '4',
              title: 'Get 180 active creators',
              target: 180,
              current: creatorCount,
              completed: creatorCount >= 180,
              description: 'Current main goal - reach 180 creators',
            },
            {
              id: '5',
              title: 'Bring 280 paid users annually for +5% bonus',
              target: 280,
              current: annualPaidUsers,
              completed: annualPaidUsers >= 280,
              description: 'Unlock +5% bonus commission (13% total)',
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    }
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'DC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateDiscountCode = async () => {
    if (!selectedCreatorId) return;

    const codeValue = isAutoGenerate ? generateCode() : newCodeValue.toUpperCase();
    
    if (!codeValue || codeValue.length < 3) {
      toast.error('Please enter a valid discount code');
      return;
    }

    setIsCreatingCode(true);

    const { error } = await supabase
      .from('discount_codes')
      .insert({
        code: codeValue,
        creator_id: selectedCreatorId,
        discount_percent: 10,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This discount code already exists');
      } else {
        toast.error('Failed to create discount code');
      }
    } else {
      toast.success('Discount code created');
      setDialogOpen(false);
      setNewCodeValue('');
      fetchData();
    }

    setIsCreatingCode(false);
  };

  const referralLink = cmoProfile?.referral_code
    ? `${window.location.origin}/creator-signup?ref_cmo=${cmoProfile.referral_code}`
    : '';

  // CMO bonus eligibility: 280 annual users goal
  const bonusEligible = stats.annualPaidUsers >= 280;
  const bonusProgress = Math.min((stats.annualPaidUsers / 280) * 100, 100);

  // Get top 5 creators by revenue
  const topCreators = [...creators].slice(0, 5);

  const chartColors = {
    primary: 'hsl(45, 93%, 47%)',
    secondary: 'hsl(217, 91%, 60%)',
    tertiary: 'hsl(142, 71%, 45%)',
    quaternary: 'hsl(262, 83%, 58%)',
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="font-display text-xl font-bold text-foreground">
                CMO Dashboard
              </Link>
              <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                CMO
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">{profile?.full_name || user?.email}</span>
              <InboxButton />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Last Updated Timestamp */}
        <div className="flex items-center justify-end mb-2">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${format(lastUpdated, 'PPp')}` : ''}
          </p>
        </div>

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            CMO Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your content creators and track business performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalCreators}</p>
            <p className="text-muted-foreground text-sm">Total Creators</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalPaidUsersThisMonth}</p>
            <p className="text-muted-foreground text-sm">Paid Users This Month</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">LKR {stats.totalRevenueGenerated.toLocaleString()}</p>
            <p className="text-muted-foreground text-sm">Revenue Generated</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.annualPaidUsers}</p>
            <p className="text-muted-foreground text-sm">Annual Paid Users</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Creator Growth Chart */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Creator Growth</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="creatorsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="creators" stroke={chartColors.secondary} fill="url(#creatorsGradient)" name="Creators" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>

          {/* Paid Users Trend */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Paid Users Trend</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line type="monotone" dataKey="paid_users" stroke={chartColors.tertiary} strokeWidth={2} name="Paid Users" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Bonus Progress & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bonus Progress */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Annual Bonus Progress</h3>
            <div className="flex items-center gap-6">
              <ProgressRing 
                progress={bonusProgress} 
                size={100} 
                strokeWidth={8}
                color={bonusEligible ? 'hsl(142, 71%, 45%)' : 'hsl(45, 93%, 47%)'}
              />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.annualPaidUsers} / 280</p>
                <p className="text-sm text-muted-foreground">
                  {bonusEligible 
                    ? '🎉 Bonus unlocked! +5% commission' 
                    : `${280 - stats.annualPaidUsers} more paid users for +5% bonus`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Goals</h3>
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3">
                  {goal.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${goal.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {goal.title}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Your Creator Onboarding Link</h3>
              <p className="text-sm text-muted-foreground">Share with potential creators to join your network</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input 
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(referralLink, 'Referral link')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Top Creators Bar Chart */}
        {topCreators.length > 0 && (
          <div className="glass-card p-6 mb-8">
            <h3 className="font-semibold text-foreground mb-4">Top Creators by Paid Users</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCreators.map(c => ({ 
                name: c.display_name?.substring(0, 10) || 'Unknown', 
                value: c.lifetime_paid_users 
              }))}>
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Creators Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Your Creators</h3>
            <span className="text-sm text-muted-foreground">{creators.length} creators</span>
          </div>
          {creators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Referral Code</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">This Month</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Lifetime</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Commission</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Discount Codes</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {creators.map((creator) => (
                    <tr key={creator.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{creator.display_name || 'Unknown'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                          {creator.referral_code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-foreground">{creator.monthly_paid_users}</td>
                      <td className="px-4 py-3 text-foreground">{creator.lifetime_paid_users}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          creator.commission_rate === 0.12 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {Math.round(creator.commission_rate * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {creator.discount_codes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {creator.discount_codes.map((dc) => (
                              <span key={dc.code} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                {dc.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Dialog open={dialogOpen && selectedCreatorId === creator.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) setSelectedCreatorId(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedCreatorId(creator.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Discount Code</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm text-muted-foreground">
                                Creating code for: <span className="font-medium text-foreground">{creator.display_name}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="autoGenerate"
                                  checked={isAutoGenerate}
                                  onChange={(e) => setIsAutoGenerate(e.target.checked)}
                                  className="rounded"
                                />
                                <Label htmlFor="autoGenerate">Auto-generate code</Label>
                              </div>
                              {!isAutoGenerate && (
                                <Input
                                  placeholder="Enter custom code"
                                  value={newCodeValue}
                                  onChange={(e) => setNewCodeValue(e.target.value.toUpperCase())}
                                />
                              )}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleCreateDiscountCode} disabled={isCreatingCode}>
                                {isCreatingCode ? 'Creating...' : 'Create Code'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No creators yet</p>
              <p className="text-sm text-muted-foreground">
                Share your referral link to onboard creators
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CMODashboard;