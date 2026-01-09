import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  GRADE_LABELS,
  STREAM_LABELS,
  MEDIUM_LABELS,
  TIER_LABELS,
  GRADE_GROUPS,
  StreamType,
  GradeLevel,
} from "@/types/database";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import { BASKET_LABELS, validateSubjectSelection, StreamSubject } from "@/lib/subjectValidation";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

interface PaymentData {
  tier: string;
  amount: number;
  orderId: string;
  paymentId?: string;
  timestamp: number;
  refCreator?: string;
  discountCode?: string;
  status?: string;
}

const PaidSignup = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { user, enrollment } = useAuth();
  
  // Check for payment data
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  
  // Payment verification state
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  
  // Step management
  const [step, setStep] = useState<'account' | 'enrollment' | 'subjects' | 'success'>('account');
  
  // Account details
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  
  // Enrollment choices
  const [selectedGrade, setSelectedGrade] = useState<string>("al_grade12");
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedMedium, setSelectedMedium] = useState<string>("english");
  
  // Subject selection (for A/L students)
  const [streamSubjects, setStreamSubjects] = useState<StreamSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Redirect if already logged in with enrollment
  useEffect(() => {
    if (user && enrollment) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, enrollment, navigate]);

  // Verify payment status with polling
  const verifyPayment = useCallback(async (orderId: string, attempt = 1): Promise<boolean> => {
    const MAX_ATTEMPTS = 15; // 15 attempts x 2 seconds = 30 seconds max
    const POLL_INTERVAL = 2000; // 2 seconds
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "payhere-checkout/verify-payment",
        { body: { order_id: orderId } }
      );
      
      if (error) {
        console.error("Payment verification error:", error);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          return verifyPayment(orderId, attempt + 1);
        }
        return false;
      }
      
      console.log("Payment verification response:", data);
      
      if (data.status === "completed") {
        return true;
      } else if (data.status === "failed" || data.status === "cancelled" || data.status === "chargedback") {
        // Payment failed - show specific error
        const reason = data.failure_reason || 
          (data.status === "cancelled" ? "Payment was cancelled" : "Payment failed");
        setVerificationError(reason);
        return false;
      } else if (data.status === "pending" && attempt < MAX_ATTEMPTS) {
        // Still pending - keep polling
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        return verifyPayment(orderId, attempt + 1);
      }
      
      // Max attempts reached, still pending
      if (attempt >= MAX_ATTEMPTS) {
        setVerificationError("Payment verification timed out. If payment was successful, please contact support.");
      }
      return false;
    } catch (err) {
      console.error("Payment verification failed:", err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        return verifyPayment(orderId, attempt + 1);
      }
      return false;
    }
  }, []);

  // Load payment data from localStorage and verify
  useEffect(() => {
    const storedPayment = localStorage.getItem('pending_payment');
    if (storedPayment) {
      try {
        const data = JSON.parse(storedPayment) as PaymentData;
        // Check if payment is less than 24 hours old
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          setPaymentData(data);
          
          // Start payment verification
          setIsVerifying(true);
          verifyPayment(data.orderId).then((verified) => {
            setIsVerifying(false);
            if (verified) {
              setPaymentVerified(true);
              toast.success("Payment verified successfully!");
            } else if (!verificationError) {
              setVerificationError("Payment could not be verified. Please try again or contact support.");
            }
          });
        } else {
          localStorage.removeItem('pending_payment');
          toast.error("Payment session expired. Please try again.");
          navigate('/pricing');
        }
      } catch {
        localStorage.removeItem('pending_payment');
        navigate('/pricing');
      }
    } else {
      toast.error("No payment found. Please complete payment first.");
      navigate('/pricing');
    }
  }, [navigate, verifyPayment, verificationError]);

  // Fetch subjects when stream is selected
  useEffect(() => {
    if (selectedStream && selectedGrade.startsWith('al_')) {
      fetchStreamSubjects(selectedStream as StreamType);
    }
  }, [selectedStream, selectedGrade]);

  const fetchStreamSubjects = async (stream: StreamType) => {
    setIsLoadingSubjects(true);
    const { data, error } = await supabase
      .from('stream_subjects')
      .select('*')
      .eq('stream', stream)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching subjects:', error);
    } else {
      // Cast the data to StreamSubject with proper typing
      const typedData = (data || []).map(d => ({
        ...d,
        stream: d.stream as StreamType,
      })) as StreamSubject[];
      setStreamSubjects(typedData);
      // Pre-select mandatory subjects
      const mandatory = typedData.filter(s => s.is_mandatory).map(s => s.subject_name);
      setSelectedSubjects(mandatory);
    }
    setIsLoadingSubjects(false);
  };

  const toggleSubject = (subjectName: string) => {
    const subject = streamSubjects.find(s => s.subject_name === subjectName);
    if (subject?.is_mandatory) return;
    
    setSelectedSubjects(prev => {
      if (prev.includes(subjectName)) {
        return prev.filter(s => s !== subjectName);
      }
      if (prev.length >= 3) return prev;
      return [...prev, subjectName];
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signUpSchema.safeParse({ email, password, name });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name },
      },
    });

    if (authError) {
      setIsLoading(false);
      if (authError.message.includes('already registered')) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(authError.message);
      }
      return;
    }

    if (!authData.user) {
      setIsLoading(false);
      toast.error("Failed to create account");
      return;
    }

    // Ensure profile exists and store name (profile id == auth user id)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          user_id: authData.user.id,
          email,
          full_name: name,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('Error upserting profile:', profileError);
    }

    setIsLoading(false);
    toast.success("Account created!");
    
    // Move to enrollment step
    setStep('enrollment');
  };

  const handleEnrollmentChoice = () => {
    if (!selectedGrade || !selectedMedium) {
      toast.error("Please select your grade and medium");
      return;
    }
    
    // For O/L, skip stream and subjects
    if (selectedGrade.startsWith('ol_')) {
      handleFinalSubmit();
      return;
    }
    
    if (!selectedStream) {
      toast.error("Please select your stream");
      return;
    }
    
    // Move to subject selection for A/L
    setStep('subjects');
  };

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SV-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleFinalSubmit = async () => {
    if (!paymentData) return;
    
    setIsLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("Session expired. Please sign in again.");
      navigate('/auth');
      return;
    }

    // Verify payment was actually successful before creating enrollment
    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "payhere-checkout/verify-payment",
        { body: { order_id: paymentData.orderId } }
      );

      if (verifyError) {
        console.error("Payment verification error:", verifyError);
        // Allow proceeding if verification service is down but log warning
        console.warn("Payment verification service unavailable, proceeding with enrollment");
      } else if (verifyData && !verifyData.verified) {
        // Payment was not verified - check if it's still pending
        if (verifyData.status === "pending") {
          toast.error("Payment is still being processed. Please wait a moment and try again.");
          setIsLoading(false);
          return;
        } else if (verifyData.status === "failed" || verifyData.status === "cancelled") {
          toast.error("Payment was not successful. Please try again.");
          localStorage.removeItem('pending_payment');
          navigate('/pricing');
          return;
        }
      }

      // Get referral info from verified payment data if available
      const verifiedRefCreator = verifyData?.ref_creator || paymentData.refCreator || localStorage.getItem('refCreator');
      const verifiedDiscountCode = verifyData?.discount_code || paymentData.discountCode;

      // Update paymentData with verified info
      if (verifiedRefCreator && !paymentData.refCreator) {
        paymentData.refCreator = verifiedRefCreator;
      }
      if (verifiedDiscountCode && !paymentData.discountCode) {
        paymentData.discountCode = verifiedDiscountCode;
      }
    } catch (verifyErr) {
      console.error("Payment verification failed:", verifyErr);
      // Continue anyway if verification fails but log warning
    }

    // Calculate expiry based on tier (1 year for silver/gold, lifetime for platinum)
    const durationDays = paymentData.tier === 'lifetime' ? null : 365;
    const expiresAt = durationDays 
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // For paid users, we create an enrollment directly without needing an access code
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        user_id: currentUser.id,
        access_code_id: null,
        grade: selectedGrade,
        stream: selectedStream || 'maths',
        medium: selectedMedium,
        tier: paymentData.tier,
        expires_at: expiresAt,
        is_active: true,
        payment_order_id: paymentData.orderId,
      })
      .select()
      .single();

    if (enrollmentError) {
      setIsLoading(false);
      toast.error("Failed to create enrollment");
      console.error('Enrollment error:', enrollmentError);
      return;
    }

    // Update payment record with user_id and enrollment_id
    try {
      await supabase.functions.invoke("payhere-checkout/update-payment", {
        body: {
          order_id: paymentData.orderId,
          user_id: currentUser.id,
          enrollment_id: enrollmentData.id,
        },
      });
    } catch (updateErr) {
      console.error("Failed to update payment record:", updateErr);
    }

    // Handle referral attribution via edge function (uses service role to bypass RLS)
    // Also check localStorage as fallback for referral info
    const effectiveRefCreator = paymentData.refCreator || localStorage.getItem('refCreator');
    const effectiveDiscountCode = paymentData.discountCode;

    if (effectiveRefCreator || effectiveDiscountCode) {
      try {
        // Calculate discount
        const discountApplied = effectiveDiscountCode ? paymentData.amount * 0.1 : 0;
        const finalAmount = paymentData.amount - discountApplied;

        // Call edge function to handle commission attribution (bypasses RLS)
        const { error: finError } = await supabase.functions.invoke("admin-finance/finalize-payment-user", {
          body: {
            order_id: paymentData.orderId,
            enrollment_id: enrollmentData.id,
            payment_type: 'card',
            tier: paymentData.tier,
            original_amount: paymentData.amount,
            final_amount: finalAmount,
            ref_creator: effectiveRefCreator,
            discount_code: effectiveDiscountCode,
          },
        });

        if (finError) {
          console.error('Error finalizing payment attribution:', finError);
        } else {
          console.log('Payment attribution finalized successfully');
        }
      } catch (refError) {
        console.error('Error processing referral:', refError);
        // Don't fail the enrollment for referral errors
      }
    }

    // For A/L students, save subject selection
    if (selectedGrade.startsWith('al_') && selectedSubjects.length === 3) {
      const { error: subjectsError } = await supabase
        .from('user_subjects')
        .insert({
          user_id: currentUser.id,
          enrollment_id: enrollmentData.id,
          subject_1: selectedSubjects[0],
          subject_2: selectedSubjects[1],
          subject_3: selectedSubjects[2],
          is_locked: true, // Lock subjects after paid signup to allow dashboard access
          locked_at: new Date().toISOString(),
        });

      if (subjectsError) {
        console.error('Error saving subjects:', subjectsError);
      }
    }

    // Clear payment data and referral info
    localStorage.removeItem('pending_payment');
    localStorage.removeItem('ref_creator');
    localStorage.removeItem('discount_code');

    setIsLoading(false);
    setStep('success');
    toast.success("Enrollment complete!");

    // Force full page reload to ensure AuthContext fetches new enrollment data
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  };

  const isALevel = selectedGrade.startsWith('al_');
  const subjectValidation = isALevel && selectedStream
    ? validateSubjectSelection(selectedStream as StreamType, selectedSubjects, streamSubjects)
    : { valid: true, errors: [], warnings: [] };

  // Group subjects by basket
  const subjectsByBasket = streamSubjects.reduce((acc, subject) => {
    const basket = subject.basket || 'optional';
    if (!acc[basket]) acc[basket] = [];
    acc[basket].push(subject);
    return acc;
  }, {} as Record<string, StreamSubject[]>);

  const mandatorySubjects = streamSubjects
    .filter(s => s.is_mandatory)
    .map(s => s.subject_name);

  // Show loading state while verifying payment
  if (isVerifying || !paymentData) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />

        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="glass-card p-6 text-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
                <h1 className="font-display text-xl font-bold text-foreground mb-2">
                  Verifying Payment
                </h1>
                <p className="text-sm text-muted-foreground">
                  Please wait while we confirm your payment status...
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  // Show error state if payment verification failed
  if (verificationError && !paymentVerified) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />

        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="glass-card p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mb-2">
                  Payment Failed
                </h1>
                <p className="text-sm text-muted-foreground mb-5">
                  {verificationError}
                </p>
                <div className="space-y-3">
                  <Button variant="brand" className="w-full" onClick={() => {
                    const refCreator = paymentData?.refCreator || localStorage.getItem('refCreator');
                    localStorage.removeItem('pending_payment');
                    if (refCreator) {
                      navigate(`/signup?ref_creator=${refCreator}`);
                    } else {
                      navigate('/pricing');
                    }
                  }}>
                    Back to Signup
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    If you believe this is an error, please contact support with your order ID: {paymentData?.orderId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  // Only show signup flow if payment is verified
  if (!paymentVerified) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />

        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="glass-card p-6 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h1 className="font-display text-xl font-bold text-foreground mb-2">
                  Payment Pending
                </h1>
                <p className="text-sm text-muted-foreground mb-5">
                  Your payment is still being processed. Please wait or try again.
                </p>
                <Button variant="brand" className="w-full" onClick={() => navigate('/pricing')}>
                  Go to Pricing
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-lg mx-auto">
            
            {/* Payment Confirmation Banner */}
            <div className="glass-card p-4 mb-6 bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-500">Payment Successful</p>
                  <p className="text-xs text-muted-foreground">
                    {TIER_LABELS[paymentData.tier as keyof typeof TIER_LABELS]} • LKR {paymentData.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {['account', 'enrollment', ...(isALevel ? ['subjects'] : [])].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s || (step === 'success' && i < 3)
                      ? 'bg-brand text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  {i < (isALevel ? 2 : 1) && (
                    <div className={`w-8 h-0.5 ${
                      ['enrollment', 'subjects', 'success'].includes(step) && i === 0 ||
                      ['subjects', 'success'].includes(step) && i === 1
                        ? 'bg-brand' 
                        : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Create Account */}
            {step === 'account' && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Create Your Account
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Set up your credentials to access your materials
                  </p>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1.5 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 pl-10"
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1.5 block">
                      Email
                    </Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 pl-10"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1.5 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 pl-10 pr-10"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="brand" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </div>
            )}

            {/* Step 2: Choose Grade/Stream/Medium */}
            {step === 'enrollment' && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Choose Your Enrollment
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Select your grade, stream, and medium
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Grade Selection */}
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      Grade Level
                    </Label>
                    <RadioGroup value={selectedGrade} onValueChange={setSelectedGrade}>
                      {Object.entries(GRADE_GROUPS).map(([groupKey, { label: groupLabel, grades }]) => (
                        <div key={groupKey} className="space-y-2 mb-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{groupLabel}</p>
                          {grades.map((gradeValue) => (
                            <label
                              key={gradeValue}
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                                selectedGrade === gradeValue 
                                  ? 'bg-brand/10 border-brand/40' 
                                  : 'bg-secondary/50 border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <RadioGroupItem value={gradeValue} />
                              <span className="font-medium">{GRADE_LABELS[gradeValue]}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Stream Selection (A/L only) */}
                  {isALevel && (
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">
                        Stream
                      </Label>
                      <RadioGroup value={selectedStream} onValueChange={setSelectedStream}>
                        {Object.entries(STREAM_LABELS).map(([value, label]) => (
                          <label
                            key={value}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                              selectedStream === value 
                                ? 'bg-brand/10 border-brand/40' 
                                : 'bg-secondary/50 border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            <RadioGroupItem value={value} />
                            <span className="font-medium">{label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Medium Selection */}
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      Medium
                    </Label>
                    <RadioGroup value={selectedMedium} onValueChange={setSelectedMedium}>
                      {Object.entries(MEDIUM_LABELS).map(([value, label]) => (
                        <label
                          key={value}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedMedium === value 
                              ? 'bg-brand/10 border-brand/40' 
                              : 'bg-secondary/50 border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <RadioGroupItem value={value} />
                          <span className="font-medium">{label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button 
                    variant="brand" 
                    className="w-full"
                    onClick={handleEnrollmentChoice}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {isALevel ? 'Continue to Subject Selection' : 'Complete Enrollment'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <button 
                    onClick={() => setStep('account')}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Subject Selection (A/L only) */}
            {step === 'subjects' && isALevel && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Select Your Subjects
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Choose exactly 3 subjects for {STREAM_LABELS[selectedStream as keyof typeof STREAM_LABELS]}
                  </p>
                </div>

                {isLoadingSubjects ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading subjects...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Validation errors */}
                    {subjectValidation.errors.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                        {subjectValidation.errors.map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    )}

                    {/* Validation warnings */}
                    {subjectValidation.warnings.length > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
                        {subjectValidation.warnings.map((warn, i) => (
                          <p key={i}>⚠️ {warn}</p>
                        ))}
                      </div>
                    )}

                    {/* Subject lists by basket */}
                    {['mandatory', 'core', 'optional', 'restricted', 'religion', 'language', 'aesthetic'].map((basketKey) => {
                      const subjects = subjectsByBasket[basketKey];
                      if (!subjects || subjects.length === 0) return null;

                      return (
                        <div key={basketKey}>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                            {BASKET_LABELS[basketKey] || basketKey}
                            {basketKey === 'restricted' && (
                              <span className="text-yellow-500 ml-2 text-[10px]">(Limited recognition)</span>
                            )}
                          </Label>
                          <div className="space-y-2">
                            {subjects.map((subject) => {
                              const isSelected = selectedSubjects.includes(subject.subject_name);
                              const isMandatory = subject.is_mandatory;
                              const isDisabled = selectedSubjects.length >= 3 && !isSelected;
                              const isRestricted = subject.basket === 'restricted';

                              return (
                                <label
                                  key={subject.id}
                                  className={`
                                    flex items-center gap-3 p-3 rounded-lg border transition-all
                                    ${isSelected 
                                      ? isRestricted ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-brand/10 border-brand/40'
                                      : 'bg-secondary/50 border-border'}
                                    ${isMandatory ? 'cursor-default' : isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-muted-foreground/30'}
                                  `}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (!isMandatory && !isDisabled) {
                                      toggleSubject(subject.subject_name);
                                    }
                                  }}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isMandatory}
                                    className="pointer-events-none"
                                  />
                                  <span className={`flex-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {subject.subject_name}
                                  </span>
                                  {isMandatory && (
                                    <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full">
                                      Required
                                    </span>
                                  )}
                                  {isRestricted && !isMandatory && (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                      Restricted
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Selected summary */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Selected ({selectedSubjects.length}/3)</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubjects.map((s) => (
                          <span key={s} className="text-xs bg-brand/20 text-brand px-2 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button 
                      variant="brand" 
                      className="w-full"
                      onClick={handleFinalSubmit}
                      disabled={!subjectValidation.valid || selectedSubjects.length !== 3 || isLoading}
                    >
                      {isLoading ? "Creating enrollment..." : "Complete Enrollment"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <button 
                      onClick={() => setStep('enrollment')}
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Back
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="glass-card p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Welcome to {branding.siteName}!
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Your enrollment is complete. Redirecting to your dashboard...
                </p>
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default PaidSignup;
