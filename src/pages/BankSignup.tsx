import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  CheckCircle2,
  BookOpen,
  GraduationCap,
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

interface BankTransferData {
  tier: string;
  tierName: string;
  amount: number;
  originalAmount: number;
  discountCode: string | null;
  refCreator: string | null;
  timestamp: number;
}

const BankSignup = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { user, enrollment } = useAuth();
  
  const [bankData, setBankData] = useState<BankTransferData | null>(null);
  const [step, setStep] = useState<'account' | 'enrollment' | 'subjects'>('account');
  
  // Account details
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  
  // Enrollment choices
  const [selectedGrade, setSelectedGrade] = useState<string>("al_grade12");
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedMedium, setSelectedMedium] = useState<string>("english");
  
  // Subject selection
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

  // Load bank transfer data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('bank_transfer_pending');
    if (stored) {
      try {
        const data = JSON.parse(stored) as BankTransferData;
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          setBankData(data);
        } else {
          localStorage.removeItem('bank_transfer_pending');
          toast.error("Session expired. Please try again.");
          navigate('/pricing');
        }
      } catch {
        localStorage.removeItem('bank_transfer_pending');
        navigate('/pricing');
      }
    } else {
      toast.error("No payment session found.");
      navigate('/pricing');
    }
  }, [navigate]);

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
      const typedData = (data || []).map(d => ({
        ...d,
        stream: d.stream as StreamType,
      })) as StreamSubject[];
      setStreamSubjects(typedData);
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

  const generateReferenceNumber = () => {
    // Format: [Month Letter][Week Number][Day Number][Random 2 digits]
    // Example: J2589 = January, Week 2, 5th day, request #89
    const months = 'JFMAYULGSONDD'; // Unique letter per month
    const now = new Date();
    const monthLetter = months[now.getMonth()];
    const weekNumber = Math.ceil(now.getDate() / 7);
    const dayDigit = now.getDate() % 10;
    const randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${monthLetter}${weekNumber}${dayDigit}${randomPart}`;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signUpSchema.safeParse({ email, password, name });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/awaiting-payment`,
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

    // Ensure profile exists
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
    
    setStep('subjects');
  };

  const handleFinalSubmit = async () => {
    if (!bankData) return;
    
    setIsLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("Session expired. Please sign in again.");
      navigate('/auth');
      return;
    }

    // Validate subjects for A/L
    if (selectedGrade.startsWith('al_') && selectedSubjects.length !== 3) {
      toast.error("Please select exactly 3 subjects");
      setIsLoading(false);
      return;
    }

    // Create join request
    const referenceNumber = generateReferenceNumber();
    const { error: joinError } = await supabase
      .from('join_requests')
      .insert({
        user_id: currentUser.id,
        reference_number: referenceNumber,
        tier: bankData.tier,
        grade: selectedGrade,
        stream: selectedStream || null,
        medium: selectedMedium,
        subject_1: selectedSubjects[0] || null,
        subject_2: selectedSubjects[1] || null,
        subject_3: selectedSubjects[2] || null,
        amount: bankData.amount,
        ref_creator: bankData.refCreator || null,
        discount_code: bankData.discountCode || null,
        status: 'pending',
      });

    if (joinError) {
      setIsLoading(false);
      toast.error("Failed to create request");
      console.error('Join request error:', joinError);
      return;
    }

    // Create user attribution immediately (referral association)
    // This ensures the referrer sees the user in their dashboard right away
    if (bankData.refCreator) {
      try {
        const { data: creatorData } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('referral_code', bankData.refCreator.toUpperCase())
          .maybeSingle();

        if (creatorData) {
          // Check if attribution already exists
          const { data: existingAttribution } = await supabase
            .from('user_attributions')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('creator_id', creatorData.id)
            .maybeSingle();

          if (!existingAttribution) {
            await supabase.from('user_attributions').insert({
              user_id: currentUser.id,
              creator_id: creatorData.id,
              referral_source: 'link',
            });
          }
        }
      } catch (attrError) {
        console.error('Attribution error:', attrError);
        // Don't fail the signup for attribution errors
      }
    }

    // Clear bank transfer data
    localStorage.removeItem('bank_transfer_pending');
    localStorage.removeItem('refCreator');

    setIsLoading(false);
    toast.success("Request submitted!");
    navigate('/awaiting-payment');
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

  if (!bankData) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-28 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="glass-card p-6 text-center">
                <h1 className="font-display text-xl font-bold text-foreground mb-2">
                  Session Not Found
                </h1>
                <p className="text-sm text-muted-foreground mb-5">
                  Please go back to pricing and select bank transfer.
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
            
            {/* Bank Transfer Banner */}
            <div className="glass-card p-4 mb-6 bg-purple-500/10 border-purple-500/30">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-purple-500">Bank Transfer</p>
                  <p className="text-xs text-muted-foreground">
                    {TIER_LABELS[bankData.tier as keyof typeof TIER_LABELS]} • LKR {bankData.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {['account', 'enrollment', ...(isALevel ? ['subjects'] : [])].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-brand text-primary-foreground'
                      : i < ['account', 'enrollment', 'subjects'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {i < ['account', 'enrollment', 'subjects'].indexOf(step) ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < (isALevel ? 2 : 1) && (
                    <div className={`w-8 h-0.5 ${
                      i < ['account', 'enrollment', 'subjects'].indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-secondary'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Account Creation */}
            {step === 'account' && (
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-brand" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mb-1">
                  Create Your Account
                </h1>
                <p className="text-muted-foreground text-sm mb-6">
                  First, let's set up your {branding.siteName} account.
                </p>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Account"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </div>
            )}

            {/* Step 2: Enrollment Options */}
            {step === 'enrollment' && (
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-brand" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mb-1">
                  Your Study Details
                </h1>
                <p className="text-muted-foreground text-sm mb-6">
                  Tell us about your educational level.
                </p>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Grade Level</Label>
                    <RadioGroup value={selectedGrade} onValueChange={setSelectedGrade}>
                      {Object.entries(GRADE_GROUPS).map(([groupKey, { label: groupLabel, grades }]) => (
                        <div key={groupKey} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{groupLabel}</p>
                          {grades.map((gradeValue) => (
                            <div key={gradeValue} className="flex items-center space-x-2 ml-2">
                              <RadioGroupItem value={gradeValue} id={gradeValue} />
                              <Label htmlFor={gradeValue} className="cursor-pointer">{GRADE_LABELS[gradeValue]}</Label>
                            </div>
                          ))}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {selectedGrade.startsWith('al_') && (
                    <div className="space-y-3">
                      <Label>Stream</Label>
                      <RadioGroup value={selectedStream} onValueChange={setSelectedStream}>
                        {Object.entries(STREAM_LABELS).map(([value, label]) => (
                          <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={`stream-${value}`} />
                            <Label htmlFor={`stream-${value}`} className="cursor-pointer">{label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Medium of Instruction</Label>
                    <RadioGroup value={selectedMedium} onValueChange={setSelectedMedium}>
                      {Object.entries(MEDIUM_LABELS).map(([value, label]) => (
                        <div key={value} className="flex items-center space-x-2">
                          <RadioGroupItem value={value} id={`medium-${value}`} />
                          <Label htmlFor={`medium-${value}`} className="cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button 
                    variant="brand" 
                    className="w-full" 
                    onClick={handleEnrollmentChoice}
                    disabled={!selectedGrade || !selectedMedium || (isALevel && !selectedStream)}
                  >
                    {isALevel ? 'Select Subjects' : 'Continue'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Subject Selection (A/L only) */}
            {step === 'subjects' && isALevel && (
              <div className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-brand" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mb-1">
                  Select Your Subjects
                </h1>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose 3 subjects for your {STREAM_LABELS[selectedStream as keyof typeof STREAM_LABELS]} stream.
                </p>

                {isLoadingSubjects ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Mandatory subjects */}
                    {mandatorySubjects.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Compulsory Subjects
                        </h3>
                        <div className="space-y-2">
                          {mandatorySubjects.map((subject) => (
                            <div
                              key={subject}
                              className="flex items-center gap-3 p-3 rounded-lg bg-brand/10 border border-brand/30"
                            >
                              <Checkbox checked disabled />
                              <span className="text-sm text-foreground">{subject}</span>
                              <span className="ml-auto text-xs text-brand">Required</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional subjects by basket */}
                    {Object.entries(subjectsByBasket)
                      .filter(([basket]) => basket !== 'mandatory')
                      .map(([basket, subjects]) => (
                        <div key={basket}>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            {BASKET_LABELS[basket] || basket} (Choose 1)
                          </h3>
                          <div className="space-y-2">
                            {subjects.filter(s => !s.is_mandatory).map((subject) => (
                              <div
                                key={subject.subject_name}
                                onClick={() => toggleSubject(subject.subject_name)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  selectedSubjects.includes(subject.subject_name)
                                    ? 'bg-brand/10 border border-brand/30'
                                    : 'bg-secondary/50 border border-transparent hover:border-border'
                                }`}
                              >
                                <Checkbox
                                  checked={selectedSubjects.includes(subject.subject_name)}
                                  disabled={subject.is_mandatory}
                                />
                                <span className="text-sm text-foreground">{subject.subject_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                    {/* Selection summary */}
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Selected: <span className="text-foreground font-medium">{selectedSubjects.length}/3</span>
                      </p>
                      {!subjectValidation.valid && subjectValidation.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive mt-1">{err}</p>
                      ))}
                    </div>

                    <Button 
                      variant="brand" 
                      className="w-full" 
                      onClick={handleFinalSubmit}
                      disabled={isLoading || selectedSubjects.length !== 3 || !subjectValidation.valid}
                    >
                      {isLoading ? "Submitting..." : "Continue to Payment"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default BankSignup;
