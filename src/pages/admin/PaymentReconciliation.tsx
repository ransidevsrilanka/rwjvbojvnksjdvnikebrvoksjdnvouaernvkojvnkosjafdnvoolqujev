import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
  Calculator,
} from 'lucide-react';
import { format } from 'date-fns';

interface OrphanedPayment {
  order_id: string;
  user_id: string | null;
  user_email: string | null;
  amount: number | null;
  tier: string | null;
  ref_creator: string | null;
  discount_code: string | null;
  enrollment_id: string | null;
  created_at: string;
  status: string | null;
}

interface StatsComparison {
  creator_id: string;
  creator_name: string | null;
  referral_code: string;
  current_lifetime_paid_users: number;
  actual_paid_users: number;
  current_balance: number;
  actual_balance: number;
  has_discrepancy: boolean;
}

const PaymentReconciliation = () => {
  const [orphanedPayments, setOrphanedPayments] = useState<OrphanedPayment[]>([]);
  const [statsComparison, setStatsComparison] = useState<StatsComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [fixingOrderId, setFixingOrderId] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchOrphanedPayments = async () => {
    setIsLoading(true);
    try {
      // Get all completed payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('order_id, user_id, amount, tier, ref_creator, discount_code, enrollment_id, created_at, status')
        .eq('status', 'completed');

      if (paymentsError) throw paymentsError;

      // Get all payment attributions
      const { data: attributions, error: attrError } = await supabase
        .from('payment_attributions')
        .select('order_id');

      if (attrError) throw attrError;

      const attributedOrderIds = new Set((attributions || []).map(a => a.order_id));

      // Find orphaned payments (completed but no attribution)
      const orphaned = (payments || []).filter(p => !attributedOrderIds.has(p.order_id));

      // Fetch user emails for orphaned payments
      const userIds = [...new Set(orphaned.map(p => p.user_id).filter(Boolean))];
      let emailMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        emailMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.email || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      const orphanedWithEmails = orphaned.map(p => ({
        ...p,
        user_email: p.user_id ? emailMap[p.user_id] || 'Unknown' : 'Unknown',
      }));

      setOrphanedPayments(orphanedWithEmails);

      // Also fetch stats comparison
      await fetchStatsComparison();

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error fetching orphaned payments:', error);
      toast.error('Failed to fetch payment data');
    }
    setIsLoading(false);
  };

  const fetchStatsComparison = async () => {
    try {
      // Get all creators with their current stats
      const { data: creators, error: creatorsError } = await supabase
        .from('creator_profiles')
        .select('id, display_name, referral_code, lifetime_paid_users, available_balance, total_withdrawn');

      if (creatorsError) throw creatorsError;

      // Get all payment attributions grouped by creator
      const { data: attributions, error: attrError } = await supabase
        .from('payment_attributions')
        .select('creator_id, creator_commission_amount');

      if (attrError) throw attrError;

      // Calculate actual stats from attributions
      const actualStats: Record<string, { count: number; commission: number }> = {};
      for (const attr of attributions || []) {
        if (!attr.creator_id) continue;
        if (!actualStats[attr.creator_id]) {
          actualStats[attr.creator_id] = { count: 0, commission: 0 };
        }
        actualStats[attr.creator_id].count++;
        actualStats[attr.creator_id].commission += Number(attr.creator_commission_amount || 0);
      }

      // Compare current vs actual
      const comparison: StatsComparison[] = (creators || []).map(creator => {
        const actual = actualStats[creator.id] || { count: 0, commission: 0 };
        const actualBalance = actual.commission - (creator.total_withdrawn || 0);
        const currentBalance = creator.available_balance || 0;
        const currentUsers = creator.lifetime_paid_users || 0;
        
        return {
          creator_id: creator.id,
          creator_name: creator.display_name,
          referral_code: creator.referral_code,
          current_lifetime_paid_users: currentUsers,
          actual_paid_users: actual.count,
          current_balance: currentBalance,
          actual_balance: actualBalance,
          has_discrepancy: currentUsers !== actual.count || Math.abs(currentBalance - actualBalance) > 0.01,
        };
      });

      // Only show creators with discrepancies
      setStatsComparison(comparison.filter(c => c.has_discrepancy));
    } catch (error) {
      console.error('Error fetching stats comparison:', error);
    }
  };

  const fixSinglePayment = async (payment: OrphanedPayment) => {
    if (!payment.user_id) {
      toast.error('Cannot fix payment without user ID');
      return;
    }

    setFixingOrderId(payment.order_id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Not authenticated');
        setFixingOrderId(null);
        return;
      }

      const response = await supabase.functions.invoke('admin-finance/finalize-payment', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          order_id: payment.order_id,
          user_id: payment.user_id,
          enrollment_id: payment.enrollment_id,
          payment_type: 'card',
          tier: payment.tier || 'starter',
          original_amount: payment.amount || 0,
          final_amount: payment.amount || 0,
          ref_creator: payment.ref_creator,
          discount_code: payment.discount_code,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create attribution');
      }

      // Check if the response indicates actual success
      const result = response.data;
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to create attribution');
      }

      toast.success(`Fixed attribution for order ${payment.order_id}`);
      await fetchOrphanedPayments();
    } catch (error: any) {
      console.error('Error fixing payment:', error);
      toast.error('Failed to fix payment: ' + error.message);
    }
    setFixingOrderId(null);
  };

  const reconcileAll = async () => {
    if (orphanedPayments.length === 0) {
      toast.info('No orphaned payments to reconcile');
      return;
    }

    setIsReconciling(true);
    let successCount = 0;
    let failCount = 0;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      toast.error('Not authenticated');
      setIsReconciling(false);
      return;
    }

    for (const payment of orphanedPayments) {
      if (!payment.user_id) {
        failCount++;
        continue;
      }

      try {
        const response = await supabase.functions.invoke('admin-finance/finalize-payment', {
          headers: { Authorization: `Bearer ${token}` },
          body: {
            order_id: payment.order_id,
            user_id: payment.user_id,
            enrollment_id: payment.enrollment_id,
            payment_type: 'card',
            tier: payment.tier || 'starter',
            original_amount: payment.amount || 0,
            final_amount: payment.amount || 0,
            ref_creator: payment.ref_creator,
            discount_code: payment.discount_code,
          },
        });

        if (response.error) {
          console.error(`Failed to fix ${payment.order_id}:`, response.error);
          failCount++;
        } else {
          const result = response.data;
          if (result && result.success === false) {
            console.error(`Failed to fix ${payment.order_id}:`, result.error);
            failCount++;
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Error fixing ${payment.order_id}:`, err);
        failCount++;
      }
    }

    if (failCount > 0) {
      toast.warning(`Reconciliation complete: ${successCount} fixed, ${failCount} failed`);
    } else {
      toast.success(`Reconciliation complete: ${successCount} payments fixed`);
    }
    await fetchOrphanedPayments();
    setIsReconciling(false);
  };

  const recalculateAllStats = async () => {
    setIsRecalculating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Not authenticated');
        setIsRecalculating(false);
        return;
      }

      const response = await supabase.functions.invoke('admin-finance/recalculate-stats', {
        headers: { Authorization: `Bearer ${token}` },
        method: 'POST',
        body: {},
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to recalculate stats');
      }

      const result = response.data;
      if (result && result.success) {
        toast.success(`Stats recalculated: ${result.creators_updated} creators, ${result.cmo_payouts_regenerated} CMO payouts`);
        await fetchOrphanedPayments();
      } else {
        throw new Error(result?.error || 'Recalculation failed');
      }
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      toast.error('Failed to recalculate: ' + error.message);
    }
    setIsRecalculating(false);
  };

  useEffect(() => {
    fetchOrphanedPayments();
  }, []);

  const totalDiscrepancies = statsComparison.length;

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold text-foreground">
                Payment Reconciliation
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrphanedPayments}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={recalculateAllStats}
                disabled={isRecalculating}
                className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
              >
                {isRecalculating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                Recalculate All Stats
              </Button>
              <Button
                size="sm"
                onClick={reconcileAll}
                disabled={isReconciling || orphanedPayments.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-background"
              >
                {isReconciling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Reconcile All ({orphanedPayments.length})
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Orphaned Payments Status */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {orphanedPayments.length > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                <div>
                  <h2 className="font-semibold text-foreground">
                    {orphanedPayments.length > 0
                      ? `${orphanedPayments.length} Orphaned Payment${orphanedPayments.length > 1 ? 's' : ''}`
                      : 'All Payments Synced'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {orphanedPayments.length > 0
                      ? 'Completed payments missing attribution records'
                      : 'No discrepancies detected'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Discrepancies Status */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {totalDiscrepancies > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                <div>
                  <h2 className="font-semibold text-foreground">
                    {totalDiscrepancies > 0
                      ? `${totalDiscrepancies} Creator${totalDiscrepancies > 1 ? 's' : ''} with Wrong Stats`
                      : 'All Stats Accurate'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {totalDiscrepancies > 0
                      ? 'Use "Recalculate All Stats" to fix'
                      : 'Creator stats match payment attributions'}
                  </p>
                </div>
              </div>
              {lastChecked && (
                <p className="text-xs text-muted-foreground">
                  Last checked: {format(lastChecked, 'PPp')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Discrepancies Table */}
        {statsComparison.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Creator Stats Discrepancies</h3>
              <p className="text-sm text-muted-foreground">These creators have incorrect stats that don't match actual payment attributions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Referral Code</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Current Users</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actual Users</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Current Balance</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actual Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statsComparison.map((stat) => (
                    <tr key={stat.creator_id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {stat.creator_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded">
                          {stat.referral_code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={stat.current_lifetime_paid_users !== stat.actual_paid_users ? 'text-red-500 font-medium' : 'text-foreground'}>
                          {stat.current_lifetime_paid_users}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-500 font-medium">
                        {stat.actual_paid_users}
                      </td>
                      <td className="px-4 py-3">
                        <span className={Math.abs(stat.current_balance - stat.actual_balance) > 0.01 ? 'text-red-500 font-medium' : 'text-foreground'}>
                          Rs. {stat.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-500 font-medium">
                        Rs. {stat.actual_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orphaned Payments Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orphanedPayments.length > 0 ? (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Orphaned Payments</h3>
              <p className="text-sm text-muted-foreground">These payments are completed but missing attribution records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creator Ref</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orphanedPayments.map((payment) => (
                    <tr key={payment.order_id} className="hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded">
                          {payment.order_id.slice(0, 12)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {payment.user_email}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        Rs. {(payment.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-muted text-foreground capitalize">
                          {payment.tier || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {payment.ref_creator || payment.discount_code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(payment.created_at), 'PP')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fixSinglePayment(payment)}
                          disabled={fixingOrderId === payment.order_id || !payment.user_id}
                        >
                          {fixingOrderId === payment.order_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Fix'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !statsComparison.length && (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
            <p className="text-muted-foreground">
              Every completed payment has a matching attribution record and all stats are accurate.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default PaymentReconciliation;
