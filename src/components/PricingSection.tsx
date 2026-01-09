import { useEffect, useState } from "react";
import { Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import PaymentMethodDialog from "./PaymentMethodDialog";
import { toast } from "sonner";

interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

interface TierDisplay extends TierPricing {
  key: string;
  highlighted: boolean;
}

// Default pricing to show immediately while fetching
const defaultTiers: TierDisplay[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: 1500,
    period: 'year',
    description: 'Perfect for getting started',
    features: ['Access to core subjects', 'PDF notes', 'Basic support'],
    highlighted: false,
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 2500,
    period: 'year',
    description: 'Most popular choice',
    features: ['All Starter features', 'Past papers', 'Priority support', 'All subjects'],
    highlighted: true,
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: 5000,
    period: 'lifetime',
    description: 'One-time purchase',
    features: ['All Standard features', 'Lifetime access', 'Future updates', 'Premium support'],
    highlighted: false,
  },
];

const PricingSection = () => {
  const [tiers, setTiers] = useState<TierDisplay[]>(defaultTiers);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { branding } = useBranding();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierDisplay | null>(null);
  
  // Discount code state
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Referral params from URL
  const refCreator = searchParams.get("ref_creator") || "";
  const discountFromUrl = searchParams.get("discount_code") || "";

  useEffect(() => {
    fetchPricing();
    
    // Auto-apply discount code from URL
    if (discountFromUrl) {
      setDiscountCodeInput(discountFromUrl);
      validateDiscountCode(discountFromUrl);
    } 
    // If ref_creator is present, lookup their discount code
    else if (refCreator) {
      fetchCreatorDiscountCode(refCreator);
    }
  }, [discountFromUrl, refCreator]);

  const fetchCreatorDiscountCode = async (referralCode: string) => {
    try {
      // First find the creator by their referral code
      const { data: creatorData, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('id, display_name')
        .eq('referral_code', referralCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (creatorError || !creatorData) {
        console.warn('Creator not found for referral code:', referralCode);
        return;
      }

      // Then find their active discount code
      const { data: discountData, error: discountError } = await supabase
        .from('discount_codes')
        .select('code, discount_percent')
        .eq('creator_id', creatorData.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (discountError || !discountData) {
        console.warn('No discount code found for creator:', creatorData.display_name);
        return;
      }

      // Auto-apply the discount
      setDiscountCodeInput(discountData.code);
      setAppliedDiscount({ 
        code: discountData.code, 
        percent: discountData.discount_percent || 10 
      });
      toast.success(`${creatorData.display_name}'s ${discountData.discount_percent || 10}% discount applied!`);
      
      // Store creator ref in localStorage for attribution
      localStorage.setItem('refCreator', referralCode);
    } catch (err) {
      console.error('Error fetching creator discount:', err);
    }
  };

  const fetchPricing = async () => {
    setLoadingError(null);
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle();

    if (error) {
      console.error('Failed to load pricing:', error);
      setLoadingError(`Database error: ${error.message}`);
      return;
    }

    if (!data) {
      console.error('No pricing data found in site_settings');
      setLoadingError('Pricing not configured. Please add pricing data in admin settings.');
      return;
    }

    const pricing = data.value as unknown as Record<string, TierPricing>;
    const tierOrder = ['starter', 'standard', 'lifetime'];
    const displayTiers: TierDisplay[] = tierOrder.map((key) => ({
      key,
      ...pricing[key],
      features: pricing[key]?.features || [],
      highlighted: key === 'standard',
    }));
    setTiers(displayTiers);
  };

  const validateDiscountCode = async (code: string) => {
    if (!code.trim()) return;
    
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('code, discount_percent')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Invalid or expired discount code");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({ code: data.code, percent: data.discount_percent || 10 });
        toast.success(`Discount code applied! ${data.discount_percent || 10}% off`);
      }
    } catch (err) {
      console.error("Error validating discount code:", err);
      toast.error("Failed to validate discount code");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleApplyDiscount = () => {
    validateDiscountCode(discountCodeInput);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCodeInput("");
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedDiscount) return price;
    return Math.round(price * (1 - appliedDiscount.percent / 100));
  };

  const handleGetTier = (tier: TierDisplay) => {
    // Allow both logged-in and non-logged-in users to open payment dialog
    setSelectedTier(tier);
    setPaymentDialogOpen(true);
  };

  const handleBankTransfer = () => {
    // Store selected tier info for bank transfer signup flow
    const tier = selectedTier;
    if (!tier) return;
    
    localStorage.setItem('bank_transfer_pending', JSON.stringify({
      tier: tier.key,
      tierName: tier.name,
      amount: getDiscountedPrice(tier.price),
      originalAmount: tier.price,
      discountCode: appliedDiscount?.code || null,
      refCreator: refCreator || localStorage.getItem('refCreator') || null,
      timestamp: Date.now(),
    }));
    
    // Close dialog and redirect to bank transfer signup
    setPaymentDialogOpen(false);
    navigate('/bank-signup');
  };

  if (loadingError) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-lg max-w-md mx-auto">
            <p className="text-destructive font-medium">Failed to load pricing</p>
            <p className="text-muted-foreground text-sm mt-2">{loadingError}</p>
          </div>
        </div>
      </section>
    );
  }


  return (
    <>
      <section className="py-20 bg-background relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Choose Your <span className="text-brand">Access Tier</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              One-time purchase. No subscriptions. Access your entire stream's curriculum.
            </p>
          </div>

          {/* Discount Code Input */}
          <div className="max-w-md mx-auto mb-8">
            {appliedDiscount ? (
              <div className="flex items-center justify-center gap-2 p-3 bg-brand/10 border border-brand/30 rounded-lg">
                <Tag className="w-4 h-4 text-brand" />
                <span className="text-sm text-foreground">
                  Code <span className="font-semibold">{appliedDiscount.code}</span> applied - {appliedDiscount.percent}% off!
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDiscount}
                  className="h-6 w-6 p-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Have a discount code?"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyDiscount}
                  disabled={isValidatingCode || !discountCodeInput.trim()}
                >
                  {isValidatingCode ? "..." : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div 
                key={tier.key}
                className={`relative rounded-xl p-6 transition-all ${
                  tier.highlighted 
                    ? "bg-brand/10 border-2 border-brand/50" 
                    : "glass-card"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand text-primary-foreground text-xs font-medium rounded-full">
                    Popular
                  </div>
                )}

                <div className="text-center mb-5">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    {appliedDiscount ? (
                      <>
                        <span className="font-display text-lg text-muted-foreground line-through">Rs. {tier.price.toLocaleString()}</span>
                        <span className="font-display text-3xl font-bold text-brand">Rs. {getDiscountedPrice(tier.price).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="font-display text-3xl font-bold text-brand">Rs. {tier.price.toLocaleString()}</span>
                    )}
                    <span className="text-muted-foreground text-xs">/{tier.period}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{tier.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-brand" />
                      </div>
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={tier.highlighted ? "brand" : "brand-outline"} 
                  className="w-full"
                  size="sm"
                  onClick={() => handleGetTier(tier)}
                >
                  Get {tier.name}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-muted-foreground text-xs mt-8">
            Purchase your access card and use the code to unlock your {branding.siteName}.
          </p>
        </div>
      </section>

      {selectedTier && (
        <PaymentMethodDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          tier={selectedTier.key}
          tierName={selectedTier.name}
          amount={getDiscountedPrice(selectedTier.price)}
          originalAmount={selectedTier.price}
          discountCode={appliedDiscount?.code}
          refCreator={refCreator || localStorage.getItem('refCreator') || undefined}
          userEmail={user?.email}
          userName={profile?.full_name || user?.email?.split("@")[0]}
          isNewUser={!user}
          onBankTransfer={handleBankTransfer}
        />
      )}
    </>
  );
};

export default PricingSection;