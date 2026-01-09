import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/storageClient';
import Navbar from '@/components/Navbar';
import UploadOverlay from '@/components/UploadOverlay';
import PaymentMethodDialog from '@/components/PaymentMethodDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, Building2, CheckCircle, Copy, Crown, MessageCircle, Upload } from 'lucide-react';
import { TIER_LABELS, type TierType } from '@/types/database';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';

interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

type PricingConfig = Record<TierType, TierPricing>;

const TIER_ORDER: TierType[] = ['starter', 'standard', 'lifetime'];

const UpgradePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, enrollment, profile, isLoading: authLoading } = useAuth();
  const { branding, isLoading: brandingLoading } = useBranding();

  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  const [requestedTier, setRequestedTier] = useState<TierType | null>(null);
  const [amount, setAmount] = useState(0);

  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [requestFlowStarted, setRequestFlowStarted] = useState(false);
  const [requestCreating, setRequestCreating] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptInputKey, setReceiptInputKey] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const isHighestTier = enrollment?.tier === 'lifetime';

  // Bank details from branding settings
  const bankDetails = branding.bankDetails || {
    bankName: 'Bank of Ceylon',
    accountName: 'ReadVault Education',
    accountNumber: '1234567890',
    branch: 'Colombo Main',
  };

  const getTierDisplayName = useMemo(() => {
    return (tier: TierType) => pricing?.[tier]?.name || TIER_LABELS[tier];
  }, [pricing]);

  // Fetch pricing
  useEffect(() => {
    const fetchPricing = async () => {
      setPricingLoading(true);
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'pricing').single();
      if (!error && data) setPricing(data.value as unknown as PricingConfig);
      setPricingLoading(false);
    };

    fetchPricing();
  }, []);

  // Check for existing upgrade request
  useEffect(() => {
    if (!user) return;

    const checkExistingRequest = async () => {
      const { data, error } = await supabase
        .from('upgrade_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) setExistingRequest(data ?? null);
    };

    checkExistingRequest();
  }, [user?.id]);

  // Set requested tier from URL params
  useEffect(() => {
    if (!enrollment || !pricing) return;

    const tier = searchParams.get('tier') as TierType;
    if (tier && TIER_ORDER.includes(tier)) {
      const currentIndex = TIER_ORDER.indexOf(enrollment.tier);
      const requestedIndex = TIER_ORDER.indexOf(tier);

      if (requestedIndex > currentIndex) {
        setRequestedTier(tier);
        const targetPrice = pricing[tier].price;
        const currentPrice = pricing[enrollment.tier].price;
        const priceDiff = targetPrice - currentPrice;
        setAmount(Math.round(priceDiff * 1.1));
        return;
      }
    }

    setRequestedTier(null);
    setAmount(0);
  }, [enrollment?.tier, pricing, searchParams]);

  // Redirect if highest tier
  useEffect(() => {
    if (isHighestTier) navigate('/dashboard', { replace: true });
  }, [isHighestTier, navigate]);

  // Create request record when landing on page with tier param (if no existing request)
  useEffect(() => {
    if (!user || !enrollment || !requestedTier || existingRequest || requestCreating) return;

    const createRequest = async () => {
      setRequestCreating(true);
      const refNumber = generateReferenceNumber();
      const { data, error } = await supabase
        .from('upgrade_requests')
        .insert({
          user_id: user.id,
          enrollment_id: enrollment.id,
          reference_number: refNumber,
          current_tier: enrollment.tier,
          requested_tier: requestedTier,
          amount: amount,
        })
        .select()
        .single();
      
      if (!error && data) {
        setExistingRequest(data);
      }
      setRequestCreating(false);
    };

    createRequest();
  }, [user?.id, enrollment?.id, requestedTier, existingRequest, amount, requestCreating]);

  // Upload receipt when file is selected
  useEffect(() => {
    if (!receiptFile || !user || !requestFlowStarted) return;
    void submitUpgradeWithReceipt(receiptFile);
  }, [receiptFile, requestFlowStarted, user?.id]);

  const generateReferenceNumber = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const copyReference = async (referenceNumber: string) => {
    await navigator.clipboard.writeText(referenceNumber);
    toast.success('Reference number copied');
  };

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size must be less than 25MB');
      return;
    }

    setReceiptFile(file);
  };

  const submitUpgradeWithReceipt = async (file: File) => {
    if (!user || !enrollment || !requestedTier) return;

    try {
      setIsUploading(true);

      // 1) Ensure we have a pending request record.
      let request = existingRequest;
      if (!request) {
        const refNumber = generateReferenceNumber();
        const { data, error } = await supabase
          .from('upgrade_requests')
          .insert({
            user_id: user.id,
            enrollment_id: enrollment.id,
            reference_number: refNumber,
            current_tier: enrollment.tier,
            requested_tier: requestedTier,
            amount: amount,
          })
          .select()
          .single();
        if (error) throw error;
        request = data;
      }

      // 2) Upload receipt file.
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${request.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('upgrade-receipts').upload(filePath, file, {
        upsert: true,
        contentType: file.type || undefined,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      // 3) Persist receipt and keep status = pending.
      const { data: updated, error: updateError } = await supabase
        .from('upgrade_requests')
        .update({ receipt_url: filePath })
        .eq('id', request.id)
        .select()
        .single();
      if (updateError) throw updateError;

      setExistingRequest(updated);
      setRequestFlowStarted(false);
      setReceiptFile(null);
      setReceiptInputKey((k) => k + 1);

      toast.success('Upgrade request submitted');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ? `Submission failed: ${err.message}` : 'Submission failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Loading
  if (authLoading || pricingLoading || brandingLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="glass-card p-10 text-center">
              <p className="text-muted-foreground">Loading…</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // No enrollment
  if (!enrollment) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="glass-card p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Active Enrollment</h1>
              <p className="text-muted-foreground mb-6">You need an active enrollment to request an upgrade.</p>
              <Link to="/activate">
                <Button type="button" variant="default">Activate Access Code</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Pricing unavailable
  if (!pricing) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="glass-card p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Pricing Unavailable</h1>
              <p className="text-muted-foreground mb-6">Unable to load pricing information. Please try again later.</p>
              <Link to="/dashboard">
                <Button type="button" variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Highest tier hard-block (redirect already happens). Keep DOM clean.
  if (isHighestTier) return null;

  const currentIndex = TIER_ORDER.indexOf(enrollment.tier);
  const availableUpgrades = TIER_ORDER.slice(currentIndex + 1);

  // Persistent backend-controlled state: once receipt is submitted (receipt_url present), show ONLY static review message.
  if (existingRequest?.status === 'pending' && existingRequest?.receipt_url) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-foreground" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-3">Upgrade request under review</h1>
              <p className="text-muted-foreground mb-6">We've received your submission. Our team will review and apply the upgrade.</p>

              <div className="bg-secondary/30 rounded-lg p-4 text-left mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Requested tier</span>
                  <span className="text-sm font-medium text-foreground">{getTierDisplayName(existingRequest.requested_tier as TierType)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Reference</span>
                  <span className="font-mono text-sm text-foreground">{existingRequest.reference_number}</span>
                </div>
              </div>

              <Link to="/dashboard">
                <Button type="button" variant="brand" className="w-full">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // No upgrades available
  if (availableUpgrades.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="glass-card p-8 text-center">
              <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">No upgrades available</h1>
              <p className="text-muted-foreground">Your account is already at the highest available tier.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Tier selection screen
  if (!requestedTier) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Request an Upgrade</h1>
            <p className="text-muted-foreground mb-8">Current plan: <span className="font-semibold text-foreground">{getTierDisplayName(enrollment.tier)}</span></p>

            <div className="grid gap-4">
              {availableUpgrades.map((tier) => {
                const targetPrice = pricing[tier].price;
                const currentPrice = pricing[enrollment.tier].price;
                const priceDiff = targetPrice - currentPrice;
                const finalAmount = Math.round(priceDiff * 1.1);

                return (
                  <button
                    key={tier}
                    onClick={() => {
                      setRequestedTier(tier);
                      setAmount(finalAmount);
                      setPaymentDialogOpen(true);
                    }}
                    className="glass-card p-6 text-left hover:border-brand/40 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-display text-xl font-semibold text-foreground">{getTierDisplayName(tier)}</h2>
                        <p className="text-muted-foreground text-sm mt-1">{pricing[tier].description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">Rs. {finalAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">One-time payment</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {requestedTier && (
          <PaymentMethodDialog
            open={paymentDialogOpen}
            onOpenChange={(open) => {
              setPaymentDialogOpen(open);
              if (!open) setRequestedTier(null);
            }}
            tier={requestedTier}
            tierName={getTierDisplayName(requestedTier)}
            amount={amount}
            userEmail={user?.email || ""}
            userName={profile?.full_name || user?.email?.split("@")[0] || "Customer"}
            enrollmentId={enrollment.id}
            onBankTransfer={() => navigate(`/upgrade?tier=${requestedTier}`)}
          />
        )}
      </main>
    );
  }

  // Confirm + explicit request flow (no auto prompts)
  const canStart = !isUploading && !!requestedTier;
  const resumeNeeded = !!existingRequest && !existingRequest.receipt_url;
  const referenceNumber = existingRequest?.reference_number;

  return (
    <main className="min-h-screen bg-background">
      <UploadOverlay isVisible={isUploading} message="Submitting…" />
      <Navbar />

      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="glass-card p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-brand" />
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Complete Your Upgrade</h1>
            <p className="text-muted-foreground mb-6">
              Transfer the amount to our bank account and upload the receipt.
            </p>

            {/* Reference Number */}
            {referenceNumber && (
              <div className="bg-brand/10 border border-brand/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                      Your Reference Number
                    </span>
                    <span className="font-mono text-lg font-bold text-foreground">
                      {referenceNumber}
                    </span>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyReference(referenceNumber)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Include this reference in your bank transfer description
                </p>
              </div>
            )}

            {/* Creating request indicator */}
            {requestCreating && !referenceNumber && (
              <div className="bg-secondary/30 rounded-lg p-4 mb-6 text-center">
                <p className="text-muted-foreground">Generating reference number...</p>
              </div>
            )}

            {/* Amount & Tier Info */}
            <div className="bg-secondary/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Current Tier</span>
                <span className="text-foreground">{getTierDisplayName(enrollment.tier)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Upgrading To</span>
                <span className="text-foreground font-semibold">{getTierDisplayName(requestedTier)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount to Pay</span>
                <span className="text-2xl font-bold text-brand">Rs. {amount.toLocaleString()}</span>
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
                      type="button"
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
            {!requestFlowStarted ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="brand"
                  className="w-full"
                  disabled={!canStart || !referenceNumber}
                  onClick={() => setRequestFlowStarted(true)}
                >
                  {resumeNeeded ? 'Upload Receipt' : 'Upload Payment Receipt'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  After transferring, upload your receipt to complete the upgrade request.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">Upload payment receipt</p>
                <Input
                  key={receiptInputKey}
                  type="file"
                  accept="application/pdf,image/*"
                  capture="environment"
                  onChange={handleReceiptSelect}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot or photo of your bank transfer confirmation (max 25MB)
                </p>
                <Button type="button" variant="outline" className="w-full" onClick={() => setRequestFlowStarted(false)} disabled={isUploading}>
                  Cancel
                </Button>
              </div>
            )}

            {/* WhatsApp Contact Button */}
            <Button 
              type="button"
              variant="ghost" 
              className="w-full mt-4 text-muted-foreground"
              onClick={() => window.open('https://wa.me/94773219334', '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Something wrong? Contact Us
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default UpgradePage;