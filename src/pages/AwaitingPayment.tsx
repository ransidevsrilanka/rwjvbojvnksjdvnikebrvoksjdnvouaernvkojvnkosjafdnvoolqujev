import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadOverlay from '@/components/UploadOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, CheckCircle, Copy, Upload, Building2, Clock, MessageCircle, RefreshCw } from 'lucide-react';
import { TIER_LABELS, type TierType } from '@/types/database';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';

interface JoinRequestData {
  id: string;
  reference_number: string;
  tier: string;
  amount: number;
  status: string;
  receipt_url: string | null;
  created_at: string;
}

const AwaitingPayment = () => {
  const navigate = useNavigate();
  const { user, enrollment, isLoading: authLoading, refreshUserData } = useAuth();
  const { branding } = useBranding();
  
  const [joinRequest, setJoinRequest] = useState<JoinRequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptInputKey, setReceiptInputKey] = useState(0);

  // Bank details from branding settings
  const bankDetails = branding.bankDetails || {
    bankName: 'Bank of Ceylon',
    accountName: 'ReadVault Education',
    accountNumber: '1234567890',
    branch: 'Colombo Main',
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // If user already has enrollment, redirect to dashboard
    if (enrollment) {
      navigate('/dashboard', { replace: true });
      return;
    }

    fetchJoinRequest();
  }, [user, authLoading, enrollment, navigate]);

  const fetchJoinRequest = async () => {
    if (!user) return;

    // First check if user has an approved join request - if so, refresh to get enrollment
    const { data: approvedRequest } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (approvedRequest) {
      // User was approved! Refresh their data to pick up the enrollment
      await refreshUserData();
      setIsLoading(false);
      // The useEffect will redirect to dashboard once enrollment is loaded
      return;
    }

    // Otherwise fetch pending join request
    const { data, error } = await supabase
      .from('join_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching join request:', error);
      toast.error('Failed to load your request');
    }

    setJoinRequest(data);
    setIsLoading(false);
  };

  const copyReference = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file || !user || !joinRequest) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size must be less than 25MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${joinRequest.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('join-receipts')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('join_requests')
        .update({ receipt_url: filePath })
        .eq('id', joinRequest.id);

      if (updateError) throw updateError;

      setJoinRequest({ ...joinRequest, receipt_url: filePath });
      setReceiptInputKey(k => k + 1);
      toast.success('Receipt uploaded successfully');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err?.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // No pending join request - show message
  if (!joinRequest) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="glass-card p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h1 className="font-display text-xl font-bold text-foreground mb-2">No Pending Request</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  You don't have any pending join requests.
                </p>
                <Button variant="brand" onClick={() => navigate('/pricing')}>
                  View Pricing
                </Button>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Receipt already uploaded - show waiting message
  if (joinRequest.receipt_url) {
    return (
      <main className="min-h-screen bg-background">
        <UploadOverlay isVisible={isUploading} message="Uploading..." />
        <Navbar />
        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto">
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-brand" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground mb-3">
                  Request Under Review
                </h1>
                <p className="text-muted-foreground mb-6">
                  We've received your payment slip. Our team will review and activate your account shortly.
                </p>

                <div className="bg-secondary/30 rounded-lg p-4 text-left mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Reference</span>
                    <span className="font-mono text-sm text-foreground">{joinRequest.reference_number}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Tier</span>
                    <span className="text-sm font-medium text-foreground">
                      {TIER_LABELS[joinRequest.tier as keyof typeof TIER_LABELS]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Amount</span>
                    <span className="text-sm font-medium text-foreground">
                      Rs. {joinRequest.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    variant="brand" 
                    className="w-full" 
                    onClick={async () => {
                      toast.loading('Checking status...');
                      await refreshUserData();
                      toast.dismiss();
                      // If enrollment exists after refresh, navigate will happen via useEffect
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                    Back to Home
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={() => window.open('https://wa.me/94773219334', '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Something wrong? Contact Us
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Show bank details and upload form
  return (
    <main className="min-h-screen bg-background">
      <UploadOverlay isVisible={isUploading} message="Uploading receipt..." />
      <Navbar />
      
      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-lg mx-auto">
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="glass-card p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-brand" />
                </div>
              </div>

              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Complete Your Payment
              </h1>
              <p className="text-muted-foreground mb-6">
                Transfer the amount to our bank account and upload the receipt.
              </p>

              {/* Reference Number */}
              <div className="bg-brand/10 border border-brand/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                      Your Reference Number
                    </span>
                    <span className="font-mono text-lg font-bold text-foreground">
                      {joinRequest.reference_number}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyReference(joinRequest.reference_number)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Include this reference in your bank transfer description
                </p>
              </div>

              {/* Amount */}
              <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Package</span>
                  <span className="text-foreground font-semibold">
                    {TIER_LABELS[joinRequest.tier as keyof typeof TIER_LABELS]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount to Pay</span>
                  <span className="text-2xl font-bold text-brand">
                    Rs. {joinRequest.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bank Details */}
              <div className="border border-border rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-foreground mb-3">Bank Transfer Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span className="text-foreground">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name</span>
                    <span className="text-foreground">{bankDetails.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">{bankDetails.accountNumber}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyReference(bankDetails.accountNumber)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="text-foreground">{bankDetails.branch}</span>
                  </div>
                </div>
              </div>

              {/* Upload Receipt */}
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">Upload Payment Receipt</p>
                <Input
                  key={receiptInputKey}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptSelect}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot or photo of your bank transfer confirmation (max 25MB)
                </p>
              </div>

              {/* WhatsApp Contact Button */}
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-muted-foreground"
                onClick={() => window.open('https://wa.me/94773219334', '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Something wrong? Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default AwaitingPayment;
