import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Users,
  Search,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { TIER_LABELS, GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS } from '@/types/database';

interface JoinRequest {
  id: string;
  user_id: string;
  reference_number: string;
  tier: string;
  grade: string | null;
  stream: string | null;
  medium: string | null;
  subject_1: string | null;
  subject_2: string | null;
  subject_3: string | null;
  amount: number;
  receipt_url: string | null;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  ref_creator: string | null;
  discount_code: string | null;
  created_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
  };
}

const REJECTION_REASONS = [
  { value: 'invalid_receipt', label: 'Invalid or unclear receipt' },
  { value: 'amount_mismatch', label: 'Payment amount does not match' },
  { value: 'duplicate', label: 'Duplicate request' },
  { value: 'fraudulent', label: 'Suspected fraudulent activity' },
  { value: 'incomplete_info', label: 'Incomplete information provided' },
  { value: 'other', label: 'Other reason (specify in notes)' },
];

const JoinRequests = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('join_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching join requests:', error);
      toast.error('Failed to load join requests');
    } else {
      // Fetch profile info for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', req.user_id)
            .maybeSingle();
          return { ...req, profile };
        })
      );
      setRequests(requestsWithProfiles);
    }
    
    setIsLoading(false);
  };

  const handleApprove = async (request: JoinRequest) => {
    setIsProcessing(true);

    try {
      // Calculate expiry based on tier (1 year for silver/gold, null for platinum)
      const durationDays = request.tier === 'lifetime' ? null : 365;
      const expiresAt = durationDays 
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: request.user_id,
          grade: request.grade,
          stream: request.stream || 'maths',
          medium: request.medium || 'english',
          tier: request.tier,
          expires_at: expiresAt,
          is_active: true,
          payment_order_id: `BANK-${request.reference_number}`,
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Save subjects if provided
      if (request.subject_1 && request.subject_2 && request.subject_3) {
        await supabase.from('user_subjects').insert({
          user_id: request.user_id,
          enrollment_id: enrollment.id,
          subject_1: request.subject_1,
          subject_2: request.subject_2,
          subject_3: request.subject_3,
          is_locked: true,
          locked_at: new Date().toISOString(),
        });
      }

      // Handle referral attribution if present
      if (request.ref_creator) {
        const { data: creatorData } = await supabase
          .from('creator_profiles')
          .select('id, lifetime_paid_users, available_balance, cmo_id')
          .eq('referral_code', request.ref_creator.toUpperCase())
          .maybeSingle();

        if (creatorData) {
          // Check if user attribution already exists (may have been created on signup)
          const { data: existingAttribution } = await supabase
            .from('user_attributions')
            .select('id')
            .eq('user_id', request.user_id)
            .eq('creator_id', creatorData.id)
            .maybeSingle();

          // Create user attribution only if it doesn't exist
          if (!existingAttribution) {
            const { error: uaError } = await supabase.from('user_attributions').insert({
              user_id: request.user_id,
              creator_id: creatorData.id,
              referral_source: 'link',
            });
            if (uaError) console.error('User attribution error:', uaError);
          }

          // Create payment attribution
          const commissionRate = (creatorData.lifetime_paid_users || 0) >= 500 ? 0.12 : 0.08;
          const commissionAmount = request.amount * commissionRate;
          const currentMonth = new Date();
          currentMonth.setDate(1);
          const paymentMonth = currentMonth.toISOString().split('T')[0];

          const { error: paError } = await supabase.from('payment_attributions').insert({
            user_id: request.user_id,
            creator_id: creatorData.id,
            enrollment_id: enrollment.id,
            amount: request.amount,
            original_amount: request.amount,
            final_amount: request.amount,
            creator_commission_rate: commissionRate,
            creator_commission_amount: commissionAmount,
            payment_month: paymentMonth,
            tier: request.tier,
            payment_type: 'bank',
          });
          if (paError) console.error('Payment attribution error:', paError);

          // Update creator lifetime paid users AND available balance
          const { error: cpError } = await supabase
            .from('creator_profiles')
            .update({ 
              lifetime_paid_users: (creatorData.lifetime_paid_users || 0) + 1,
              available_balance: (creatorData.available_balance || 0) + commissionAmount,
            })
            .eq('id', creatorData.id);
          if (cpError) console.error('Creator profile update error:', cpError);

          // Update CMO payout if creator has a CMO
          if (creatorData.cmo_id) {
            const cmoCommissionRate = 0.03; // CMO gets 3% of creator earnings
            const cmoCommission = commissionAmount * cmoCommissionRate;

            // Check if payout record exists for this month
            const { data: existingPayout } = await supabase
              .from('cmo_payouts')
              .select('*')
              .eq('cmo_id', creatorData.cmo_id)
              .eq('payout_month', paymentMonth)
              .maybeSingle();

            if (existingPayout) {
              // Update existing payout
              await supabase
                .from('cmo_payouts')
                .update({
                  total_paid_users: (existingPayout.total_paid_users || 0) + 1,
                  base_commission_amount: (existingPayout.base_commission_amount || 0) + cmoCommission,
                  total_commission: (existingPayout.total_commission || 0) + cmoCommission,
                })
                .eq('id', existingPayout.id);
            } else {
              // Create new payout record
              await supabase.from('cmo_payouts').insert({
                cmo_id: creatorData.cmo_id,
                payout_month: paymentMonth,
                total_paid_users: 1,
                base_commission_amount: cmoCommission,
                total_commission: cmoCommission,
                status: 'pending',
              });
            }
          }
        }
      }

      // Update join request status
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Join request approved! User now has access.');
      setViewDialogOpen(false);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Please select a rejection reason');
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Join request rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setAdminNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const openReceiptUrl = async (receiptUrl: string, userId: string) => {
    try {
      const { data } = await supabase.storage
        .from('join-receipts')
        .createSignedUrl(receiptUrl, 3600);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting receipt URL:', error);
      toast.error('Failed to open receipt');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.reference_number.toLowerCase().includes(search) ||
      req.profile?.email?.toLowerCase().includes(search) ||
      req.profile?.full_name?.toLowerCase().includes(search)
    );
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Join Requests</h1>
              <p className="text-muted-foreground text-sm">Review bank transfer signups</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by reference, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No join requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="glass-card p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {request.reference_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        request.status === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {request.profile?.full_name || request.profile?.email || 'Unknown user'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIER_LABELS[request.tier as keyof typeof TIER_LABELS]} • Rs. {request.amount.toLocaleString()}
                      {request.ref_creator && ` • Ref: ${request.ref_creator}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {request.receipt_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceiptUrl(request.receipt_url!, request.user_id)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Receipt
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectDialogOpen(true);
                          }}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Join Request Details</DialogTitle>
            <DialogDescription>
              Reference: {selectedRequest?.reference_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="text-foreground">{selectedRequest.profile?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="text-foreground">{selectedRequest.profile?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tier</span>
                  <p className="text-foreground">
                    {TIER_LABELS[selectedRequest.tier as keyof typeof TIER_LABELS]}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p className="text-foreground">Rs. {selectedRequest.amount.toLocaleString()}</p>
                </div>
                {selectedRequest.grade && (
                  <div>
                    <span className="text-muted-foreground">Grade</span>
                    <p className="text-foreground">
                      {GRADE_LABELS[selectedRequest.grade as keyof typeof GRADE_LABELS]}
                    </p>
                  </div>
                )}
                {selectedRequest.stream && (
                  <div>
                    <span className="text-muted-foreground">Stream</span>
                    <p className="text-foreground">
                      {STREAM_LABELS[selectedRequest.stream as keyof typeof STREAM_LABELS]}
                    </p>
                  </div>
                )}
                {selectedRequest.medium && (
                  <div>
                    <span className="text-muted-foreground">Medium</span>
                    <p className="text-foreground">
                      {MEDIUM_LABELS[selectedRequest.medium as keyof typeof MEDIUM_LABELS]}
                    </p>
                  </div>
                )}
                {selectedRequest.ref_creator && (
                  <div>
                    <span className="text-muted-foreground">Referral Code</span>
                    <p className="text-foreground font-mono">{selectedRequest.ref_creator}</p>
                  </div>
                )}
              </div>

              {(selectedRequest.subject_1 || selectedRequest.subject_2 || selectedRequest.subject_3) && (
                <div>
                  <span className="text-muted-foreground text-sm">Subjects</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[selectedRequest.subject_1, selectedRequest.subject_2, selectedRequest.subject_3]
                      .filter(Boolean)
                      .map((subject, i) => (
                        <span key={i} className="px-2 py-1 bg-secondary rounded text-xs">
                          {subject}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <span className="text-xs text-destructive font-medium">Rejection Reason</span>
                  <p className="text-sm text-foreground mt-1">
                    {REJECTION_REASONS.find(r => r.value === selectedRequest.rejection_reason)?.label || selectedRequest.rejection_reason}
                  </p>
                  {selectedRequest.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-2">{selectedRequest.admin_notes}</p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes (optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="brand"
                  onClick={() => selectedRequest && handleApprove(selectedRequest)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Approve'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Please select a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason}
            >
              {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default JoinRequests;
