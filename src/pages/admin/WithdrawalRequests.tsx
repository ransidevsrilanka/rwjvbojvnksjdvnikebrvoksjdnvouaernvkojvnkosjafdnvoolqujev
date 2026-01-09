import { useEffect, useState, useRef } from 'react';
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
  Search,
  DollarSign,
  Building2,
  Wallet,
  Upload,
  Download,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/dashboard/StatCard';

interface WithdrawalRequest {
  id: string;
  creator_id: string;
  withdrawal_method_id: string | null;
  amount: number;
  fee_percent: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  receipt_url: string | null;
  created_at: string;
  creator?: {
    display_name: string | null;
    referral_code: string;
    user_id: string;
  };
  withdrawal_method?: {
    method_type: string;
    bank_name: string | null;
    account_number: string | null;
    account_holder_name: string | null;
    crypto_type: string | null;
    wallet_address: string | null;
    network: string | null;
  };
  profile?: {
    email: string | null;
  };
}

const REJECTION_REASONS = [
  { value: 'invalid_details', label: 'Invalid withdrawal details' },
  { value: 'suspicious_activity', label: 'Suspicious activity detected' },
  { value: 'insufficient_balance', label: 'Insufficient balance' },
  { value: 'duplicate', label: 'Duplicate request' },
  { value: 'other', label: 'Other reason (specify in notes)' },
];

const WithdrawalRequests = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('pending');
  
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast.error('Failed to load withdrawal requests');
      setIsLoading(false);
      return;
    }

    const requestsWithDetails = await Promise.all(
      (data || []).map(async (req) => {
        const [creatorResult, methodResult] = await Promise.all([
          supabase
            .from('creator_profiles')
            .select('display_name, referral_code, user_id')
            .eq('id', req.creator_id)
            .maybeSingle(),
          req.withdrawal_method_id
            ? supabase
                .from('withdrawal_methods')
                .select('method_type, bank_name, account_number, account_holder_name, crypto_type, wallet_address, network')
                .eq('id', req.withdrawal_method_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        let profile = null;
        if (creatorResult.data?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', creatorResult.data.user_id)
            .maybeSingle();
          profile = profileData;
        }

        return {
          ...req,
          creator: creatorResult.data,
          withdrawal_method: methodResult.data,
          profile,
        };
      })
    );

    setRequests(requestsWithDetails);
    setIsLoading(false);
  };

  const handleUploadReceipt = async (request: WithdrawalRequest) => {
    fileInputRef.current?.click();
    setSelectedRequest(request);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedRequest.id}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('withdrawal-receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('withdrawal-receipts')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({ receipt_url: publicUrl })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      toast.success('Receipt uploaded successfully!');
      fetchRequests();
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApprove = async (request: WithdrawalRequest) => {
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', request.id);

      if (error) throw error;

      if (request.creator_id) {
        const { data: creatorData } = await supabase
          .from('creator_profiles')
          .select('total_withdrawn, available_balance')
          .eq('id', request.creator_id)
          .single();

        if (creatorData) {
          await supabase
            .from('creator_profiles')
            .update({
              total_withdrawn: (creatorData.total_withdrawn || 0) + request.net_amount,
              available_balance: Math.max(0, (creatorData.available_balance || 0) - request.amount),
            })
            .eq('id', request.creator_id);
        }
      }

      toast.success('Withdrawal approved!');
      setViewDialogOpen(false);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving withdrawal:', error);
      toast.error(error.message || 'Failed to approve withdrawal');
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
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Withdrawal rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setAdminNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      toast.error(error.message || 'Failed to reject withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async (request: WithdrawalRequest) => {
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Marked as paid!');
      fetchRequests();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error(error.message || 'Failed to mark as paid');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.creator?.display_name?.toLowerCase().includes(search) ||
      req.creator?.referral_code?.toLowerCase().includes(search) ||
      req.profile?.email?.toLowerCase().includes(search)
    );
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    paid: requests.filter(r => r.status === 'paid').length,
    totalPending: requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.net_amount, 0),
  };

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf"
        className="hidden"
      />

      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Withdrawal Requests</h1>
              <p className="text-muted-foreground text-sm">Manage creator payouts</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pending" value={stats.pending} icon={DollarSign} />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle} />
          <StatCard label="Paid" value={stats.paid} icon={Wallet} />
          <StatCard label="Pending Total" value={`Rs. ${stats.totalPending.toLocaleString()}`} icon={DollarSign} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or email..."
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
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No withdrawal requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="glass-card p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {request.creator?.display_name || 'Unknown Creator'}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        ({request.creator?.referral_code})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        request.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        request.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                        request.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {request.status}
                      </span>
                      {request.receipt_url && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Receipt
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground font-medium">
                      Rs. {request.amount.toLocaleString()} → Rs. {request.net_amount.toLocaleString()} (after {request.fee_percent}% fee)
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {request.withdrawal_method?.method_type === 'bank' ? (
                        <><Building2 className="w-3 h-3" /> Bank Transfer</>
                      ) : (
                        <><Wallet className="w-3 h-3" /> {request.withdrawal_method?.crypto_type || 'Crypto'}</>
                      )}
                      <span>•</span>
                      <span>{format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-muted-foreground/30"
                      onClick={() => {
                        setSelectedRequest(request);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    {(request.status === 'approved' || request.status === 'paid') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-muted-foreground/30"
                        onClick={() => handleUploadReceipt(request)}
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        {request.receipt_url ? 'Update' : 'Upload'} Receipt
                      </Button>
                    )}
                    
                    {request.receipt_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/30 text-emerald-400"
                        onClick={() => window.open(request.receipt_url!, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        View Receipt
                      </Button>
                    )}
                    
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
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
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleMarkPaid(request)}
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
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
            <DialogTitle>Withdrawal Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.creator?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Creator</span>
                  <p className="text-foreground">{selectedRequest.creator?.display_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="text-foreground">{selectedRequest.profile?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount Requested</span>
                  <p className="text-foreground font-medium">Rs. {selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fee ({selectedRequest.fee_percent}%)</span>
                  <p className="text-foreground">Rs. {selectedRequest.fee_amount.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Net Amount</span>
                  <p className="text-lg font-bold text-emerald-400">Rs. {selectedRequest.net_amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Withdrawal Method</h4>
                {selectedRequest.withdrawal_method?.method_type === 'bank' ? (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Bank:</span> {selectedRequest.withdrawal_method.bank_name}</p>
                    <p><span className="text-muted-foreground">Account:</span> {selectedRequest.withdrawal_method.account_number}</p>
                    <p><span className="text-muted-foreground">Holder:</span> {selectedRequest.withdrawal_method.account_holder_name}</p>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Crypto:</span> {selectedRequest.withdrawal_method?.crypto_type}</p>
                    <p><span className="text-muted-foreground">Network:</span> {selectedRequest.withdrawal_method?.network}</p>
                    <p className="break-all"><span className="text-muted-foreground">Wallet:</span> {selectedRequest.withdrawal_method?.wallet_address}</p>
                  </div>
                )}
              </div>

              {selectedRequest.receipt_url && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Payment Receipt</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400"
                    onClick={() => window.open(selectedRequest.receipt_url!, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download Receipt
                  </Button>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Admin Notes (Optional)</h4>
                  <Textarea
                    placeholder="Add notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedRequest.status === 'pending' && (
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={isProcessing}
                  >
                    Approve Withdrawal
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this withdrawal request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Reason</label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason" />
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
            <div>
              <label className="text-sm font-medium text-foreground">Additional Notes</label>
              <Textarea
                placeholder="Add notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1"
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
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WithdrawalRequests;
