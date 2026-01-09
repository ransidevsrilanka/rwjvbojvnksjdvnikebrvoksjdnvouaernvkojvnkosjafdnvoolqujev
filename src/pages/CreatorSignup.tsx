import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useBranding } from "@/hooks/useBranding";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const CreatorSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = useBranding();
  
  const refCmo = searchParams.get('ref_cmo');
  
  const [cmoProfile, setCmoProfile] = useState<{ id: string; display_name: string } | null>(null);
  const [isValidatingRef, setIsValidatingRef] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate CMO referral code
  useEffect(() => {
    const validateCmoRef = async () => {
      if (!refCmo) {
        setRefError("No referral code provided. You need a CMO invitation link to sign up as a creator.");
        setIsValidatingRef(false);
        return;
      }

      const { data, error } = await supabase
        .from('cmo_profiles')
        .select('id, display_name')
        .eq('referral_code', refCmo.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setRefError("Invalid or inactive referral link. Please contact your CMO for a valid invitation.");
      } else {
        setCmoProfile(data);
      }
      setIsValidatingRef(false);
    };

    validateCmoRef();
  }, [refCmo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cmoProfile) {
      toast.error("Invalid CMO referral");
      return;
    }
    
    const result = signUpSchema.safeParse({ email, password, name });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/creator/dashboard`,
          data: { full_name: name },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        setIsLoading(false);
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

      // Generate unique referral code for creator
      const creatorRefCode = `CRT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Use RPC function to set creator role and create profile (bypasses RLS)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('set_creator_role', {
        _user_id: authData.user.id,
        _cmo_id: cmoProfile.id,
        _display_name: name,
        _referral_code: creatorRefCode,
      });

      const result = rpcResult as { success: boolean; error?: string } | null;

      if (rpcError || !result?.success) {
        console.error('Error setting up creator:', rpcError || result?.error);
        toast.error("Failed to complete creator setup. Please contact support.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      toast.success("Account created! Starting your onboarding...");
      
      // Redirect to onboarding instead of dashboard
      setTimeout(() => {
        window.location.href = '/creator/onboarding';
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      toast.error("An error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  if (isValidatingRef) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Validating referral...</div>
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
          <div className="max-w-md mx-auto">
            
            {refError ? (
              <div className="glass-card p-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 text-destructive" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-2">
                    Invalid Referral Link
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {refError}
                  </p>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go to Homepage
                  </Button>
                </div>
              </div>
            ) : success ? (
              <div className="glass-card p-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-2">
                    Welcome, Creator!
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6">
                {/* CMO Badge */}
                <div className="bg-brand/10 border border-brand/30 rounded-lg p-3 mb-6 flex items-center gap-3">
                  <Users className="w-5 h-5 text-brand" />
                  <div>
                    <p className="text-xs text-muted-foreground">Invited by</p>
                    <p className="text-sm font-medium text-foreground">{cmoProfile?.display_name}</p>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                    <User className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Become a Content Creator
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Sign up to start earning commissions
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                    {isLoading ? "Creating account..." : "Sign Up as Creator"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Already have an account?{' '}
                  <button 
                    onClick={() => navigate('/auth')}
                    className="text-brand hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default CreatorSignup;