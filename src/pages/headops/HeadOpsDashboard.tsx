import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  BookOpen,
  DollarSign,
  Target,
  FileText,
  UserX,
  BarChart3,
  Flag,
  LogOut,
  Link as LinkIcon,
  Copy,
  Calendar,
  Award,
  Plus,
  CheckCircle2,
  Circle,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import InboxButton from '@/components/inbox/InboxButton';

interface CMOProfile {
  id: string;
  display_name: string;
  referral_code: string;
  is_active: boolean;
  user_id: string;
  is_head_ops: boolean;
}

interface CreatorProfile {
  id: string;
  display_name: string;
  referral_code: string;
  cmo_id: string | null;
  lifetime_paid_users: number;
  monthly_paid_users: number;
  is_active: boolean;
}

interface HeadOpsRequest {
  id: string;
  request_type: string;
  target_id: string;
  target_type: string;
  details: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ContentOverview {
  subject_id: string;
  subject_name: string;
  grade: string;
  stream: string;
  topic_count: number;
  note_count: number;
  is_active: boolean;
}

interface CMOPerformance {
  cmo_id: string;
  display_name: string;
  creators_count: number;
  total_paid_users: number;
  monthly_paid_users: number;
  is_active: boolean;
}

interface PlatformFinancials {
  total_revenue: number;
  referral_revenue: number;
  non_referral_revenue: number;
  this_month_revenue: number;
  total_paid_users: number;
}

interface MyCMOStats {
  totalCreators: number;
  totalPaidUsersThisMonth: number;
  totalRevenueGenerated: number;
  annualPaidUsers: number;
  lifetimePaidUsers: number;
}

interface MyCreator {
  id: string;
  display_name: string | null;
  referral_code: string;
  lifetime_paid_users: number;
  monthly_paid_users: number;
  is_active: boolean;
  discount_codes: { code: string; paid_conversions: number }[];
}

interface MonthlyData {
  month: string;
  creators: number;
  paid_users: number;
  revenue: number;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
}

const HeadOpsDashboard = () => {
  const { user, profile, isHeadOps, signOut } = useAuth();
  const navigate = useNavigate();
  
  // All CMOs/Creators (operational view)
  const [cmos, setCMOs] = useState<CMOProfile[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<HeadOpsRequest[]>([]);
  const [contentOverview, setContentOverview] = useState<ContentOverview[]>([]);
  const [cmoPerformance, setCMOPerformance] = useState<CMOPerformance[]>([]);
  const [financials, setFinancials] = useState<PlatformFinancials | null>(null);
  
  // Personal CMO data
  const [myCMOProfile, setMyCMOProfile] = useState<CMOProfile | null>(null);
  const [myCreators, setMyCreators] = useState<MyCreator[]>([]);
  const [myStats, setMyStats] = useState<MyCMOStats>({
    totalCreators: 0,
    totalPaidUsersThisMonth: 0,
    totalRevenueGenerated: 0,
    annualPaidUsers: 0,
    lifetimePaidUsers: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Request form state
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [requestDetails, setRequestDetails] = useState('');
  
  // Discount code dialog
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [newCodeValue, setNewCodeValue] = useState('');
  const [isAutoGenerate, setIsAutoGenerate] = useState(true);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect non-head-ops users
  useEffect(() => {
    if (!isLoading && !isHeadOps) {
      navigate('/cmo/dashboard', { replace: true });
    }
  }, [isHeadOps, isLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    // Fetch my CMO profile
    const { data: myProfileData } = await supabase
      .from('cmo_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (myProfileData) {
      setMyCMOProfile(myProfileData);
      
      // Fetch MY creators (personal CMO network)
      const { data: myCreatorsData } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('cmo_id', myProfileData.id)
        .order('lifetime_paid_users', { ascending: false });
      
      if (myCreatorsData) {
        const creatorIds = myCreatorsData.map(c => c.id);
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        // Fetch discount codes for my creators
        const { data: discountCodes } = await supabase
          .from('discount_codes')
          .select('id, code, paid_conversions, creator_id')
          .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);
        
        // Fetch monthly payments for my creators
        const { data: monthlyPayments } = await supabase
          .from('payment_attributions')
          .select('creator_id')
          .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('created_at', currentMonth.toISOString());
        
        // Fetch all payments for revenue
        const { data: allPayments } = await supabase
          .from('payment_attributions')
          .select('creator_id, final_amount')
          .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000']);
        
        // Aggregate monthly counts
        const monthlyCountsByCreator: Record<string, number> = {};
        (monthlyPayments || []).forEach(p => {
          monthlyCountsByCreator[p.creator_id] = (monthlyCountsByCreator[p.creator_id] || 0) + 1;
        });
        
        const creatorsWithStats: MyCreator[] = myCreatorsData.map(creator => ({
          id: creator.id,
          display_name: creator.display_name,
          referral_code: creator.referral_code,
          lifetime_paid_users: creator.lifetime_paid_users || 0,
          monthly_paid_users: monthlyCountsByCreator[creator.id] || 0,
          is_active: creator.is_active ?? true,
          discount_codes: (discountCodes || [])
            .filter(dc => dc.creator_id === creator.id)
            .map(dc => ({ code: dc.code, paid_conversions: dc.paid_conversions || 0 })),
        }));
        
        setMyCreators(creatorsWithStats);
        
        // Calculate my stats
        const totalPaidThisMonth = Object.values(monthlyCountsByCreator).reduce((sum, count) => sum + count, 0);
        const totalRevenue = (allPayments || []).reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
        const lifetimePaid = myCreatorsData.reduce((sum, c) => sum + (c.lifetime_paid_users || 0), 0);
        
        // Annual paid users
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);
        
        const { count: annualCount } = await supabase
          .from('payment_attributions')
          .select('*', { count: 'exact', head: true })
          .in('creator_id', creatorIds.length > 0 ? creatorIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('created_at', yearStart.toISOString());
        
        setMyStats({
          totalCreators: creatorsWithStats.length,
          totalPaidUsersThisMonth: totalPaidThisMonth,
          totalRevenueGenerated: totalRevenue,
          annualPaidUsers: annualCount || 0,
          lifetimePaidUsers: lifetimePaid,
        });
        
        // Fetch monthly data
        const { data: monthlyRpcData } = await supabase
          .rpc('get_cmo_monthly_data', { p_cmo_id: myProfileData.id, p_months: 6 });
        
        if (monthlyRpcData) {
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
          { id: '1', title: 'Get 5 active creators', target: 5, current: creatorCount, completed: creatorCount >= 5 },
          { id: '2', title: 'Get 20 active creators', target: 20, current: creatorCount, completed: creatorCount >= 20 },
          { id: '3', title: 'Get 100 active creators', target: 100, current: creatorCount, completed: creatorCount >= 100 },
          { id: '4', title: '280 annual paid users for +5% bonus', target: 280, current: annualPaidUsers, completed: annualPaidUsers >= 280 },
        ]);
      }
    }
    
    // Fetch ALL CMOs (operational view)
    const { data: cmosData } = await supabase
      .from('cmo_profiles')
      .select('*')
      .order('display_name');
    
    if (cmosData) setCMOs(cmosData);

    // Fetch ALL creators (operational view)
    const { data: creatorsData } = await supabase
      .from('creator_profiles')
      .select('*')
      .order('display_name');
    
    if (creatorsData) setCreators(creatorsData);

    // Fetch my requests
    const { data: requestsData } = await supabase
      .from('head_ops_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    
    if (requestsData) setMyRequests(requestsData as HeadOpsRequest[]);

    // Fetch content overview
    const { data: contentData } = await supabase
      .from('subjects')
      .select(`id, name, grade, stream, is_active, topics (id, notes:notes(id))`)
      .order('grade')
      .order('stream');
    
    if (contentData) {
      const overview = contentData.map(s => ({
        subject_id: s.id,
        subject_name: s.name,
        grade: s.grade || '',
        stream: s.stream || '',
        topic_count: (s.topics as any[])?.length || 0,
        note_count: (s.topics as any[])?.reduce((acc: number, t: any) => acc + (t.notes?.length || 0), 0) || 0,
        is_active: s.is_active ?? true
      }));
      setContentOverview(overview);
    }

    // Fetch CMO performance data
    const { data: cmoData } = await supabase
      .from('cmo_profiles')
      .select(`id, display_name, is_active, creator_profiles (id, lifetime_paid_users, monthly_paid_users)`)
      .order('display_name');
    
    if (cmoData) {
      const performance = cmoData.map(cmo => ({
        cmo_id: cmo.id,
        display_name: cmo.display_name || 'Unknown',
        is_active: cmo.is_active ?? true,
        creators_count: (cmo.creator_profiles as any[])?.length || 0,
        total_paid_users: (cmo.creator_profiles as any[])?.reduce((acc: number, c: any) => acc + (c.lifetime_paid_users || 0), 0) || 0,
        monthly_paid_users: (cmo.creator_profiles as any[])?.reduce((acc: number, c: any) => acc + (c.monthly_paid_users || 0), 0) || 0
      }));
      setCMOPerformance(performance);
    }

    // Fetch platform financials
    const { data: paData } = await supabase
      .from('payment_attributions')
      .select('final_amount, creator_id, created_at, user_id');
    
    if (paData) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      setFinancials({
        total_revenue: paData.reduce((sum, p) => sum + (p.final_amount || 0), 0),
        referral_revenue: paData.filter(p => p.creator_id).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        non_referral_revenue: paData.filter(p => !p.creator_id).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        this_month_revenue: paData.filter(p => new Date(p.created_at) >= thisMonth).reduce((sum, p) => sum + (p.final_amount || 0), 0),
        total_paid_users: new Set(paData.map(p => p.user_id)).size
      });
    }

    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const handleSubmitRequest = async () => {
    if (!selectedRequestType || !requestDetails.trim()) {
      toast.error('Please select a request type and provide details');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('head_ops_requests').insert({
      requester_id: user?.id,
      request_type: selectedRequestType,
      target_id: selectedTarget || null,
      target_type: selectedRequestType.includes('cmo') ? 'cmo' : 
                   selectedRequestType.includes('creator') ? 'creator' : null,
      details: { description: requestDetails },
      status: 'pending'
    });

    if (error) {
      toast.error('Failed to submit request');
    } else {
      toast.success('Request submitted for admin approval');
      setSelectedRequestType('');
      setSelectedTarget('');
      setRequestDetails('');
      fetchData();

      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'head_ops_request',
          message: `Head of Ops submitted a ${selectedRequestType} request`,
          data: { type: selectedRequestType, details: requestDetails.substring(0, 100) }
        }
      });
    }

    setIsSubmitting(false);
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
      .insert({ code: codeValue, creator_id: selectedCreatorId, discount_percent: 10 });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'remove_cmo': 'Remove CMO',
      'demote_cmo': 'Demote CMO',
      'remove_creator': 'Remove Creator',
      'suspend_creator': 'Suspend Creator',
      'enforce_deadline': 'Enforce Deadline',
      'flag_content': 'Flag Content Issue',
      'escalate': 'Escalate Issue'
    };
    return labels[type] || type;
  };

  const referralLink = myCMOProfile?.referral_code
    ? `${window.location.origin}/creator-signup?ref_cmo=${myCMOProfile.referral_code}`
    : '';

  const bonusEligible = myStats.annualPaidUsers >= 280;
  const bonusProgress = Math.min((myStats.annualPaidUsers / 280) * 100, 100);

  const chartColors = {
    primary: 'hsl(45, 93%, 47%)',
    secondary: 'hsl(217, 91%, 60%)',
    tertiary: 'hsl(142, 71%, 45%)',
  };

  const activeCreators = creators.filter(c => c.is_active);
  const inactiveCreators = creators.filter(c => !c.is_active);
  const underperformingCreators = creators.filter(c => c.is_active && (c.lifetime_paid_users || 0) < 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
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
                Head of Ops Dashboard
              </Link>
              <span className="px-2 py-0.5 rounded bg-brand/20 text-brand text-xs font-medium">
                Head of Operations
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">
                {profile?.full_name || user?.email}
              </span>
              <InboxButton />
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Last Updated */}
        <div className="flex items-center justify-end mb-2">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last updated: ${format(lastUpdated, 'PPp')}` : ''}
          </p>
        </div>

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Welcome back, {profile?.full_name || 'Head of Ops'}
          </h1>
          <p className="text-muted-foreground">
            Manage operations and grow your personal creator network
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{myStats.totalCreators}</p>
            <p className="text-xs text-muted-foreground">My Creators</p>
          </div>

          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{myStats.totalPaidUsersThisMonth}</p>
            <p className="text-xs text-muted-foreground">My Paid This Month</p>
          </div>

          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-brand" />
            </div>
            <p className="text-xl font-bold text-foreground">LKR {myStats.totalRevenueGenerated.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">My Revenue</p>
          </div>

          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{cmos.length}</p>
            <p className="text-xs text-muted-foreground">Total CMOs</p>
          </div>

          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{activeCreators.length}</p>
            <p className="text-xs text-muted-foreground">All Creators</p>
          </div>

          <div className="glass-card p-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{myRequests.filter(r => r.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="my-performance" className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full bg-secondary/50">
            <TabsTrigger value="my-performance">My Performance</TabsTrigger>
            <TabsTrigger value="my-creators">My Creators</TabsTrigger>
            <TabsTrigger value="all-creators">All Creators</TabsTrigger>
            <TabsTrigger value="cmos">CMOs</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          {/* MY PERFORMANCE TAB */}
          <TabsContent value="my-performance" className="space-y-6">
            {/* Referral Link */}
            <div className="glass-card p-6">
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
                <Input value={referralLink} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={() => copyToClipboard(referralLink, 'Referral link')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="creators" stroke={chartColors.secondary} fill="url(#creatorsGradient)" name="Creators" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data yet</div>
                )}
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Paid Users Trend</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData}>
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="paid_users" stroke={chartColors.tertiary} strokeWidth={2} name="Paid Users" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data yet</div>
                )}
              </div>
            </div>

            {/* Bonus Progress & Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p className="text-2xl font-bold text-foreground">{myStats.annualPaidUsers} / 280</p>
                    <p className="text-sm text-muted-foreground">
                      {bonusEligible 
                        ? '🎉 Bonus unlocked! +5% commission' 
                        : `${280 - myStats.annualPaidUsers} more paid users for +5% bonus`
                      }
                    </p>
                  </div>
                </div>
              </div>

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
                      <span className="text-xs text-muted-foreground">{goal.current}/{goal.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Creators Chart */}
            {myCreators.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-4">My Top Creators by Paid Users</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={myCreators.slice(0, 5).map(c => ({ 
                    name: c.display_name?.substring(0, 10) || 'Unknown', 
                    value: c.lifetime_paid_users 
                  }))}>
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          {/* MY CREATORS TAB */}
          <TabsContent value="my-creators">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Your Creators</h3>
                <span className="text-sm text-muted-foreground">{myCreators.length} creators</span>
              </div>
              {myCreators.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Referral Code</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">This Month</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Lifetime</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Discount Codes</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {myCreators.map((creator) => (
                        <tr key={creator.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{creator.display_name || 'Unknown'}</p>
                              {!creator.is_active && <Badge variant="outline" className="text-red-500 text-xs">Inactive</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{creator.referral_code}</code>
                          </td>
                          <td className="px-4 py-3 text-foreground">{creator.monthly_paid_users}</td>
                          <td className="px-4 py-3 text-foreground">{creator.lifetime_paid_users}</td>
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
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCreatorId(creator.id)}>
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
                  <p className="text-sm text-muted-foreground">Share your referral link to onboard creators</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ALL CREATORS TAB (Operational View) */}
          <TabsContent value="all-creators">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand" />
                  All Creators (Platform-wide)
                </CardTitle>
                <CardDescription>
                  View all creator performance and request actions • {activeCreators.length} active • {inactiveCreators.length} inactive • {underperformingCreators.length} need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {creators.map((creator) => {
                    const cmo = cmos.find(c => c.id === creator.cmo_id);
                    const isUnderperforming = creator.is_active && (creator.lifetime_paid_users || 0) < 5;
                    
                    return (
                      <div 
                        key={creator.id} 
                        className={`p-4 rounded-lg border ${
                          isUnderperforming ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-secondary/30 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{creator.display_name || 'Unknown'}</p>
                              {!creator.is_active && <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>}
                              {isUnderperforming && (
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />Low Performance
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Code: {creator.referral_code} • CMO: {cmo?.display_name || 'Unassigned'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Monthly: <strong className="text-foreground">{creator.monthly_paid_users || 0}</strong></span>
                              <span>Lifetime: <strong className="text-foreground">{creator.lifetime_paid_users || 0}</strong></span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequestType('remove_creator');
                              setSelectedTarget(creator.id);
                              setRequestDetails(`Request to remove creator: ${creator.display_name}`);
                            }}
                            className="text-xs"
                          >
                            <Flag className="w-3 h-3 mr-1" />
                            Request Action
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CMO MONITORING TAB */}
          <TabsContent value="cmos">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand" />
                  CMO Performance Monitoring
                </CardTitle>
                <CardDescription>Track CMO targets and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {cmoPerformance.map((cmo) => (
                    <div key={cmo.cmo_id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{cmo.display_name}</p>
                            {!cmo.is_active && <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Creators: <strong className="text-foreground">{cmo.creators_count}</strong></span>
                            <span>Monthly Users: <strong className="text-foreground">{cmo.monthly_paid_users}</strong></span>
                            <span>Total Users: <strong className="text-foreground">{cmo.total_paid_users}</strong></span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequestType('demote_cmo');
                            setSelectedTarget(cmo.cmo_id);
                            setRequestDetails(`Request regarding CMO: ${cmo.display_name}`);
                          }}
                          className="text-xs"
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Request Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT TAB */}
          <TabsContent value="content">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand" />
                  Content Oversight
                </CardTitle>
                <CardDescription>Monitor content completion status by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {contentOverview.map((subject) => (
                    <div 
                      key={subject.subject_id} 
                      className={`p-4 rounded-lg border ${
                        subject.note_count === 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-secondary/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{subject.subject_name}</p>
                            {!subject.is_active && <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Inactive</Badge>}
                            {subject.note_count === 0 && <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">No Content</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{subject.grade} • {subject.stream}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Topics: <strong className="text-foreground">{subject.topic_count}</strong></span>
                            <span>Notes: <strong className="text-foreground">{subject.note_count}</strong></span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequestType('flag_content');
                            setSelectedTarget(subject.subject_id);
                            setRequestDetails(`Content issue with: ${subject.subject_name}`);
                          }}
                          className="text-xs"
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Flag Issue
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCIALS TAB */}
          <TabsContent value="financials">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand" />
                  Financial Overview
                </CardTitle>
                <CardDescription>Read-only platform revenue summary (no payout details)</CardDescription>
              </CardHeader>
              <CardContent>
                {financials ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground">LKR {financials.total_revenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold text-green-500">LKR {financials.this_month_revenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Total Paid Users</p>
                      <p className="text-2xl font-bold text-foreground">{financials.total_paid_users}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-brand/10 border border-brand/30">
                      <p className="text-xs text-muted-foreground mb-1">Referral Revenue</p>
                      <p className="text-xl font-bold text-brand">LKR {financials.referral_revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {financials.total_revenue > 0 ? `${((financials.referral_revenue / financials.total_revenue) * 100).toFixed(1)}% of total` : '0%'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Non-Referral Revenue</p>
                      <p className="text-xl font-bold text-foreground">LKR {financials.non_referral_revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {financials.total_revenue > 0 ? `${((financials.non_referral_revenue / financials.total_revenue) * 100).toFixed(1)}% of total` : '0%'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No financial data available</p>
                )}
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    This is a read-only view. You cannot access payout schedules, modify commissions, or trigger payments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REQUESTS TAB */}
          <TabsContent value="requests" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submit Request */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-brand" />
                    Submit Request
                  </CardTitle>
                  <CardDescription>All requests require admin approval before execution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Request Type</label>
                    <select
                      value={selectedRequestType}
                      onChange={(e) => setSelectedRequestType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                    >
                      <option value="">Select a request type...</option>
                      <option value="remove_cmo">Remove CMO</option>
                      <option value="demote_cmo">Demote CMO</option>
                      <option value="remove_creator">Remove Creator</option>
                      <option value="suspend_creator">Suspend Creator</option>
                      <option value="enforce_deadline">Enforce Content Deadline</option>
                      <option value="flag_content">Flag Content Issue</option>
                      <option value="escalate">Escalate Issue</option>
                    </select>
                  </div>

                  {(selectedRequestType.includes('cmo') || selectedRequestType.includes('creator')) && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Select {selectedRequestType.includes('cmo') ? 'CMO' : 'Creator'}
                      </label>
                      <select
                        value={selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value)}
                        className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground"
                      >
                        <option value="">Select...</option>
                        {selectedRequestType.includes('cmo') 
                          ? cmos.filter(c => !c.is_head_ops).map(cmo => (
                              <option key={cmo.id} value={cmo.id}>{cmo.display_name}</option>
                            ))
                          : creators.map(creator => (
                              <option key={creator.id} value={creator.id}>{creator.display_name}</option>
                            ))
                        }
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Details / Reason</label>
                    <Textarea
                      value={requestDetails}
                      onChange={(e) => setRequestDetails(e.target.value)}
                      placeholder="Provide detailed reasoning for this request..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button 
                    variant="brand" 
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting || !selectedRequestType || !requestDetails.trim()}
                    className="w-full"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit for Admin Approval
                  </Button>
                </CardContent>
              </Card>

              {/* My Requests */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand" />
                    My Requests
                  </CardTitle>
                  <CardDescription>Track the status of your submitted requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {myRequests.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No requests submitted yet</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {myRequests.map((request) => (
                        <div key={request.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{getRequestTypeLabel(request.request_type)}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.details?.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(request.created_at).toLocaleDateString()}</p>
                          {request.admin_notes && (
                            <p className="text-xs text-brand mt-2 italic border-t border-border pt-2">
                              Admin response: {request.admin_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default HeadOpsDashboard;
