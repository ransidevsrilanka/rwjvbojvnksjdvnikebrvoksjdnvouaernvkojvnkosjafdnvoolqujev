import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Eye,
  RefreshCw,
  Crown,
  Download,
  Trash2
} from 'lucide-react';
import { TIER_LABELS, TierType } from '@/types/database';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface UpgradeRequest {
  id: string;
  user_id: string;
  enrollment_id: string;
  reference_number: string;
  current_tier: TierType;
  requested_tier: TierType;
  amount: number;
  receipt_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { email: string; full_name: string | null } | null;
}

const UpgradeRequests = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchRequests();
  }, [isAdmin, navigate]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('upgrade_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profiles for each request
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedRequests = data.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) || null,
      }));
      
      setRequests(enrichedRequests as UpgradeRequest[]);
    }
    setIsLoading(false);
  };

  const viewReceipt = async (request: UpgradeRequest) => {
    setSelectedRequest(request);
    setReviewNotes(request.admin_notes || '');
    
    if (request.receipt_url) {
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(request.receipt_url, 3600);
      
      setReceiptUrl(data?.signedUrl || null);
    } else {
      setReceiptUrl(null);
    }
  };

  const downloadReceipt = async () => {
    if (!selectedRequest?.receipt_url || !receiptUrl) return;
    
    try {
      const response = await fetch(receiptUrl);
      const blob = await response.blob();
      const ext = selectedRequest.receipt_url.split('.').pop() || 'jpg';
      const filename = `${selectedRequest.reference_number}.${ext}`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Receipt downloaded');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download receipt');
    }
  };

  const deleteReceipt = async () => {
    if (!selectedRequest?.receipt_url) return;
    
    try {
      const { error } = await supabase.storage
        .from('receipts')
        .remove([selectedRequest.receipt_url]);
      
      if (error) throw error;
      
      // Clear receipt_url from database
      await supabase
        .from('upgrade_requests')
        .update({ receipt_url: null })
        .eq('id', selectedRequest.id);
      
      setReceiptUrl(null);
      setSelectedRequest({ ...selectedRequest, receipt_url: null });
      toast.success('Receipt deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete receipt');
    }
  };

  const approveRequest = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    // Update enrollment tier
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .update({ tier: selectedRequest.requested_tier })
      .eq('id', selectedRequest.enrollment_id);

    if (enrollmentError) {
      toast.error('Failed to update enrollment');
      setIsProcessing(false);
      return;
    }

    // Update request status
    const { error: requestError } = await supabase
      .from('upgrade_requests')
      .update({
        status: 'approved',
        admin_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    if (requestError) {
      toast.error('Failed to update request');
    } else {
      toast.success(`Upgraded to ${TIER_LABELS[selectedRequest.requested_tier]} successfully!`);
      setSelectedRequest(null);
      fetchRequests();
    }
    setIsProcessing(false);
  };

  const rejectRequest = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from('upgrade_requests')
      .update({
        status: 'rejected',
        admin_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Request rejected');
      setSelectedRequest(null);
      fetchRequests();
    }
    setIsProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      approved: 'bg-green-500/10 text-green-500',
      rejected: 'bg-red-500/10 text-red-500',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.cancelled}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <Navbar />
      
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link 
              to="/admin" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </Link>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-gold" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Upgrade Requests
                  </h1>
                  <p className="text-muted-foreground">Review and approve tier upgrades</p>
                </div>
              </div>
              <Button variant="outline" onClick={fetchRequests}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-gold mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center">
                <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upgrade requests yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Upgrade</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        {request.reference_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{TIER_LABELS[request.current_tier]}</span>
                        <span className="mx-2">→</span>
                        <span className="text-gold font-medium">{TIER_LABELS[request.requested_tier]}</span>
                      </TableCell>
                      <TableCell>Rs. {request.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {request.receipt_url ? (
                          <span className="text-green-500 text-sm">Uploaded</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not uploaded</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewReceipt(request)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </section>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Upgrade Request</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-mono">{selectedRequest.reference_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p>{selectedRequest.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Upgrade</p>
                  <p>
                    {TIER_LABELS[selectedRequest.current_tier]} → {TIER_LABELS[selectedRequest.requested_tier]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-gold font-semibold">Rs. {selectedRequest.amount.toLocaleString()}</p>
                </div>
              </div>

              {receiptUrl ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Receipt</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadReceipt}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <img 
                    src={receiptUrl} 
                    alt="Receipt" 
                    className="mt-2 max-h-64 rounded-lg border border-border"
                  />
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-500 text-sm">No receipt uploaded yet</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Admin Notes</p>
                <Input
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={rejectRequest}
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="brand"
                  onClick={approveRequest}
                  disabled={isProcessing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Upgrade
                </Button>
              </>
            )}
            {selectedRequest?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the receipt image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteReceipt();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default UpgradeRequests;
