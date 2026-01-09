import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, 
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  CheckCircle2,
  Clock,
  Tag,
  Calendar,
  Plus,
  Wallet,
  Building2,
  Bitcoin,
  ArrowUpRight,
  Target,
  Award,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { TrendIndicator } from '@/components/dashboard/TrendIndicator';
import { ChartLegend } from '@/components/dashboard/ChartLegend';
import InboxButton from '@/components/inbox/InboxButton';

interface CreatorAnalytics {
  id: string;
  user_id: string;
  display_name: string | null;
  referral_code: string;
  cmo_id: string | null;
  is_active: boolean | null;
  created_at: string;
  total_withdrawn: number | null;
  available_balance: number | null;
  cmo_name: string | null;
  lifetime_paid_users: number;
  commission_rate: number;
  monthly_paid_users: number;
  total_commission_earned: number;
  discount_code_count: number;
  total_referred_users: number;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  paid_conversions: number;
  is_active: boolean;
}

interface WithdrawalMethod {
  id: string;
  method_type: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  branch_name: string | null;
  crypto_type: string | null;
  wallet_address: string | null;
  network: string | null;
  is_primary: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface MonthlyData {
  month: string;
  earnings: number;
  referrals: number;
  conversions: number;
}

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

const CRYPTO_TYPES = ['USDT', 'BTC', 'ETH', 'BNB'];
const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20'];

const CreatorDashboard = () => {
  const { user, profile, isCreator, signOut } = useAuth();
  const navigate = useNavigate();
  const [creatorData, setCreatorData] = useState<CreatorAnalytics | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [minimumPayout, setMinimumPayout] = useState(10000);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Dialog states
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [methodType, setMethodType] = useState<'bank' | 'crypto'>('bank');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [branchName, setBranchName] = useState('');

  // Crypto form
  const [cryptoType, setCryptoType] = useState('USDT');
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');

  useEffect(() => {
    if (!isCreator) {
      navigate('/');
      return;
    }
    checkOnboardingAndFetchData();
  }, [isCreator, navigate, user]);

  const checkOnboardingAndFetchData = async () => {
    if (!user) return;

    // Check if onboarding is completed
    const { data: onboardingData } = await supabase
      .from('creator_onboarding')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!onboardingData?.completed_at) {
      // Not completed, redirect to onboarding
      navigate('/creator/onboarding');
      return;
    }

    // Fetch commission tiers and platform settings
    const [tiersResult, settingsResult] = await Promise.all([
      supabase.from('commission_tiers').select('*').order('tier_level', { ascending: true }),
      supabase.from('platform_settings').select('setting_key, setting_value'),
    ]);

    if (tiersResult.data) {
      setCommissionTiers(tiersResult.data);
    }

    if (settingsResult.data) {
      const minPayoutSetting = settingsResult.data.find(s => s.setting_key === 'minimum_payout_lkr');
      if (minPayoutSetting?.setting_value) {
        const value = typeof minPayoutSetting.setting_value === 'number'
          ? minPayoutSetting.setting_value
          : Number(minPayoutSetting.setting_value);
        setMinimumPayout(value);
      }
    }

    fetchData();
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // First get creator profile to get ID
      const { data: creatorProfile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching creator profile:', profileError);
        throw profileError;
      }

      if (creatorProfile) {
        // Get CMO name if exists
        let cmoName: string | null = null;
        if (creatorProfile.cmo_id) {
          const { data: cmoData } = await supabase
            .from('cmo_profiles')
            .select('display_name')
            .eq('id', creatorProfile.cmo_id)
            .maybeSingle();
          cmoName = cmoData?.display_name || null;
        }

        // Get monthly stats from payment_attributions
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { count: monthlyPaidUsers } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id)
          .gte('created_at', currentMonth.toISOString());

        const { data: totalCommissionData } = await supabase
          .from('payment_attributions')
          .select('creator_commission_amount')
          .eq('creator_id', creatorProfile.id);

        const totalCommission = (totalCommissionData || []).reduce(
          (sum, p) => sum + Number(p.creator_commission_amount || 0), 0
        );

        const { count: totalReferred } = await supabase
          .from('user_attributions')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id);

        const { count: discountCodeCount } = await supabase
          .from('discount_codes')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorProfile.id);

        // Calculate commission rate based on MONTHLY users using commission_tiers
        const monthlyCount = monthlyPaidUsers || 0;
        let currentCommissionRate = 8; // Default base rate
        for (const tier of commissionTiers) {
          if (monthlyCount >= tier.monthly_user_threshold) {
            currentCommissionRate = tier.commission_rate;
          }
        }

        // Build analytics object
        const analyticsData: CreatorAnalytics = {
          id: creatorProfile.id,
          user_id: creatorProfile.user_id,
          display_name: creatorProfile.display_name,
          referral_code: creatorProfile.referral_code,
          cmo_id: creatorProfile.cmo_id,
          is_active: creatorProfile.is_active,
          created_at: creatorProfile.created_at,
          total_withdrawn: creatorProfile.total_withdrawn,
          available_balance: creatorProfile.available_balance,
          cmo_name: cmoName,
          lifetime_paid_users: creatorProfile.lifetime_paid_users || 0,
          commission_rate: currentCommissionRate / 100, // Store as decimal for backwards compatibility
          monthly_paid_users: monthlyCount,
          total_commission_earned: totalCommission,
          discount_code_count: discountCodeCount || 0,
          total_referred_users: totalReferred || 0,
        };

        setCreatorData(analyticsData);

        // Fetch discount codes
        const { data: dcData } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('creator_id', creatorProfile.id);
        setDiscountCodes(dcData || []);

        // Fetch withdrawal methods
        const { data: wmData } = await supabase
          .from('withdrawal_methods')
          .select('*')
          .eq('creator_id', creatorProfile.id);
        setWithdrawalMethods(wmData || []);

        // Fetch withdrawal requests
        const { data: wrData } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('creator_id', creatorProfile.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setWithdrawalRequests(wrData || []);

        // Fetch monthly data using RPC function
        const { data: monthlyRpcData, error: monthlyError } = await supabase
          .rpc('get_creator_monthly_data', { 
            p_creator_id: creatorProfile.id,
            p_months: 6 
          });

        if (!monthlyError && monthlyRpcData) {
          setMonthlyData(monthlyRpcData.map((m: any) => ({
            month: m.month,
            earnings: Number(m.earnings) || 0,
            referrals: Number(m.referrals) || 0,
            conversions: Number(m.conversions) || 0,
          })));
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

  const handleAddWithdrawalMethod = async () => {
    if (!creatorData) return;

    if (methodType === 'bank') {
      if (!bankName || !accountNumber || !accountHolderName) {
        toast.error('Please fill in all bank details');
        return;
      }
    } else {
      if (!walletAddress) {
        toast.error('Please enter wallet address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('withdrawal_methods').insert({
        creator_id: creatorData.id,
        method_type: methodType,
        bank_name: methodType === 'bank' ? bankName : null,
        account_number: methodType === 'bank' ? accountNumber : null,
        account_holder_name: methodType === 'bank' ? accountHolderName : null,
        branch_name: methodType === 'bank' ? branchName : null,
        crypto_type: methodType === 'crypto' ? cryptoType : null,
        wallet_address: methodType === 'crypto' ? walletAddress : null,
        network: methodType === 'crypto' ? network : null,
        is_primary: withdrawalMethods.length === 0,
      });

      if (error) throw error;

      toast.success('Withdrawal method added!');
      setAddMethodDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      console.error('Error adding withdrawal method:', error);
      toast.error(error.message || 'Failed to add withdrawal method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!creatorData || !selectedMethodId) {
      toast.error('Please select a withdrawal method');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const currentBalance = creatorData.available_balance || 0;
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate minimum payout
    if (amount < minimumPayout) {
      toast.error(`Minimum withdrawal is LKR ${minimumPayout.toLocaleString()}`);
      return;
    }

    if (amount > currentBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const feePercent = 3;
      const feeAmount = amount * (feePercent / 100);
      const netAmount = amount - feeAmount;

      const { error } = await supabase.from('withdrawal_requests').insert({
        creator_id: creatorData.id,
        withdrawal_method_id: selectedMethodId,
        amount,
        fee_percent: feePercent,
        fee_amount: feeAmount,
        net_amount: netAmount,
      });

      if (error) throw error;

      toast.success('Withdrawal request submitted!');
      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setSelectedMethodId('');
      fetchData();
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setBankName('');
    setAccountNumber('');
    setAccountHolderName('');
    setBranchName('');
    setCryptoType('USDT');
    setWalletAddress('');
    setNetwork('TRC20');
  };

  const handleWithdrawAll = () => {
    setWithdrawAmount((creatorData?.available_balance || 0).toString());
  };

  const referralLink = creatorData 
    ? `${window.location.origin}/signup?ref_creator=${creatorData.referral_code}`
    : '';

  const availableBalance = creatorData?.available_balance || 0;
  const lifetimePaidUsers = creatorData?.lifetime_paid_users || 0;
  const monthlyPaidUsers = creatorData?.monthly_paid_users || 0;
  const totalReferred = creatorData?.total_referred_users || 0;
  const commissionRate = creatorData?.commission_rate || 0.08;
  const totalCommission = creatorData?.total_commission_earned || 0;

  const isEligibleForPayout = monthlyPaidUsers >= 100;
  const feePreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) * 0.03 : 0;
  const netPreview = parseFloat(withdrawAmount) ? parseFloat(withdrawAmount) - feePreview : 0;

  // Commission tier progress - based on MONTHLY users now
  const getCurrentTier = () => {
    let current = commissionTiers[0];
    for (const tier of commissionTiers) {
      if (monthlyPaidUsers >= tier.monthly_user_threshold) {
        current = tier;
      }
    }
    return current;
  };

  const getNextTier = () => {
    for (const tier of commissionTiers) {
      if (monthlyPaidUsers < tier.monthly_user_threshold) {
        return tier;
      }
    }
    return null;
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const tierProgress = nextTier 
    ? Math.min((monthlyPaidUsers / nextTier.monthly_user_threshold) * 100, 100)
    : 100;
  const isTopTier = !nextTier;

  // Funnel data
  const funnelData = [
    { name: 'Referred', value: totalReferred, color: 'hsl(217, 91%, 60%)' },
    { name: 'Converted', value: lifetimePaidUsers, color: 'hsl(45, 93%, 47%)' },
  ];

  const chartColors = {
    primary: 'hsl(45, 93%, 47%)',
    secondary: 'hsl(217, 91%, 60%)',
    tertiary: 'hsl(142, 71%, 45%)',
    quaternary: 'hsl(262, 83%, 58%)',
  };

  // Discount code performance data for chart
  const discountCodeData = discountCodes.map(dc => ({
    name: dc.code,
    conversions: dc.paid_conversions,
    usage: dc.usage_count,
  }));

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
                Creator Dashboard
              </Link>
              <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                Creator
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
            Welcome back, {creatorData?.display_name || profile?.full_name || 'Creator'}
          </h1>
          <p className="text-muted-foreground">
            Here's how your referrals are performing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalReferred}</p>
            <p className="text-muted-foreground text-sm">Total Users Referred</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{monthlyPaidUsers}</p>
            <p className="text-muted-foreground text-sm">Paid Users This Month</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{lifetimePaidUsers}</p>
            <p className="text-muted-foreground text-sm">Lifetime Paid Users</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">LKR {availableBalance.toLocaleString()}</p>
            <p className="text-muted-foreground text-sm">Available Balance</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Earnings Chart */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Monthly Earnings</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Earnings']}
                  />
                  <Area type="monotone" dataKey="earnings" stroke={chartColors.primary} fill="url(#earningsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={funnelData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend items={funnelData.map(d => ({ name: d.name, color: d.color }))} />
          </div>
        </div>

        {/* Commission Tier Progress */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Commission Tier</h3>
              <p className="text-sm text-muted-foreground">
                {isTopTier 
                  ? `You've reached the top tier: ${currentTier?.tier_name}!` 
                  : `Get ${(nextTier?.monthly_user_threshold || 0) - monthlyPaidUsers} more users this month for ${nextTier?.commission_rate}%`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{currentTier?.commission_rate || 8}%</p>
              <p className="text-xs text-muted-foreground">Current Rate</p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${isTopTier ? 'bg-green-500' : 'bg-brand'}`}
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{monthlyPaidUsers} users this month</span>
            <span>{nextTier ? `${nextTier.monthly_user_threshold} users (${nextTier.commission_rate}%)` : 'Top tier reached!'}</span>
          </div>
          
          {/* All Tiers Display */}
          {commissionTiers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">All Commission Tiers (based on monthly users)</p>
              <div className="flex flex-wrap gap-2">
                {commissionTiers.map((tier) => (
                  <div 
                    key={tier.id}
                    className={`px-3 py-1.5 rounded-full text-xs ${
                      currentTier?.id === tier.id 
                        ? 'bg-brand text-primary-foreground font-medium' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tier.tier_name}: {tier.commission_rate}% ({tier.monthly_user_threshold}+ users)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Referral Link */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Your Referral Link</h3>
              <p className="text-sm text-muted-foreground">Share to earn commissions</p>
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
          <p className="text-xs text-muted-foreground mt-2">
            Referral Code: <span className="font-mono font-medium">{creatorData?.referral_code}</span>
          </p>
        </div>

        {/* Discount Codes */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Discount Codes</h3>
                <p className="text-sm text-muted-foreground">Share with your audience</p>
              </div>
            </div>
          </div>
          {discountCodes.length > 0 ? (
            <div className="space-y-3">
              {discountCodes.map((dc) => (
                <div key={dc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="font-mono font-medium text-foreground">{dc.code}</code>
                    <span className="text-xs text-muted-foreground">({dc.discount_percent}% off)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{dc.paid_conversions} conversions</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(dc.code, 'Discount code')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No discount codes yet. Contact your CMO to get one.</p>
          )}
        </div>

        {/* Withdrawal Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Withdrawal Methods */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Withdrawal Methods</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAddMethodDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            {withdrawalMethods.length > 0 ? (
              <div className="space-y-3">
                {withdrawalMethods.map((wm) => (
                  <div key={wm.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    {wm.method_type === 'bank' ? (
                      <Building2 className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Bitcoin className="w-5 h-5 text-orange-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {wm.method_type === 'bank' ? wm.bank_name : wm.crypto_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wm.method_type === 'bank' 
                          ? `****${wm.account_number?.slice(-4)}` 
                          : `${wm.wallet_address?.slice(0, 8)}...`}
                      </p>
                    </div>
                    {wm.is_primary && (
                      <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Add a withdrawal method to cash out</p>
            )}
          </div>

          {/* Quick Withdraw */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Withdraw Funds</h3>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-foreground">LKR {availableBalance.toLocaleString()}</p>
            </div>
            <Button 
              variant="brand" 
              className="w-full"
              disabled={availableBalance < 100 || withdrawalMethods.length === 0}
              onClick={() => setWithdrawDialogOpen(true)}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            {withdrawalMethods.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Add a withdrawal method first
              </p>
            )}
            {availableBalance < 100 && withdrawalMethods.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Minimum withdrawal: LKR 100
              </p>
            )}
          </div>
        </div>

        {/* Recent Withdrawals */}
        {withdrawalRequests.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Withdrawals</h3>
            <div className="space-y-3">
              {withdrawalRequests.map((wr) => (
                <div key={wr.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">LKR {wr.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(wr.created_at), 'PP')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      wr.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                      wr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {wr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Withdrawal Method Dialog */}
      <Dialog open={addMethodDialogOpen} onOpenChange={setAddMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Withdrawal Method</DialogTitle>
            <DialogDescription>
              Add a bank account or crypto wallet for withdrawals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={methodType === 'bank' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethodType('bank')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Bank
              </Button>
              <Button
                variant={methodType === 'crypto' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMethodType('crypto')}
              >
                <Bitcoin className="w-4 h-4 mr-2" />
                Crypto
              </Button>
            </div>

            {methodType === 'bank' ? (
              <>
                <Input
                  placeholder="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <Input
                  placeholder="Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
                <Input
                  placeholder="Account Holder Name"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
                <Input
                  placeholder="Branch Name (Optional)"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </>
            ) : (
              <>
                <Select value={cryptoType} onValueChange={setCryptoType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crypto" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Wallet Address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWithdrawalMethod} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-foreground">LKR {availableBalance.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <Button variant="outline" onClick={handleWithdrawAll}>
                Max
              </Button>
            </div>
            {parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground">LKR {parseFloat(withdrawAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Fee (3%)</span>
                  <span className="text-red-500">-LKR {feePreview.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">You'll receive</span>
                  <span className="text-green-500">LKR {netPreview.toLocaleString()}</span>
                </div>
              </div>
            )}
            <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal method" />
              </SelectTrigger>
              <SelectContent>
                {withdrawalMethods.map((wm) => (
                  <SelectItem key={wm.id} value={wm.id}>
                    {wm.method_type === 'bank' 
                      ? `${wm.bank_name} - ****${wm.account_number?.slice(-4)}`
                      : `${wm.crypto_type} - ${wm.wallet_address?.slice(0, 8)}...`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CreatorDashboard;