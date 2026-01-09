import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, CheckCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS } from "@/types/database";
import { useBranding } from "@/hooks/useBranding";

const codeSchema = z.string().min(6, "Access code must be at least 6 characters");
const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

interface ValidatedCode {
  id: string;
  grade: string;
  stream: string;
  medium: string;
  tier: string;
  duration_days: number;
}

const Access = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'code' | 'signup' | 'success'>('code');
  const [accessCode, setAccessCode] = useState("");
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { branding } = useBranding();
  
  // Use refs to prevent race conditions during remounts
  const validationInProgressRef = useRef(false);
  const hasAutoValidatedRef = useRef(false);
  const mountedRef = useRef(true);

  // Mark component as unmounted on cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateCode = useCallback(async (code: string) => {
    // Prevent duplicate validations
    if (validationInProgressRef.current) return;
    
    const result = codeSchema.safeParse(code);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    validationInProgressRef.current = true;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('validate_access_code', {
        _code: code.toUpperCase()
      });

      // Check if still mounted before updating state
      if (!mountedRef.current) return;

      if (error) {
        console.error('RPC error:', error);
        toast.error("Failed to validate code. Please try again.");
        return;
      }

      if (!data) {
        toast.error("No response from server. Please try again.");
        return;
      }

      const response = data as {
        valid: boolean;
        error?: string;
        message?: string;
        code_id?: string;
        grade?: string;
        stream?: string;
        medium?: string;
        tier?: string;
        duration_days?: number;
      };

      if (!response.valid) {
        const errorMessage = response.message || 
          (response.error === 'INVALID_CODE' ? 'Access code not found' :
           response.error === 'CODE_NOT_ACTIVE' ? 'This access code is no longer active' :
           response.error === 'CODE_FULLY_USED' ? 'This access code has already been used' :
           response.error === 'CODE_EXPIRED' ? 'This access code has expired' :
           'Invalid access code');
        toast.error(errorMessage);
        return;
      }

      setValidatedCode({
        id: response.code_id!,
        grade: response.grade!,
        stream: response.stream!,
        medium: response.medium!,
        tier: response.tier!,
        duration_days: response.duration_days!,
      });
      setStep('signup');
      toast.success("Access code validated!");
    } catch (err) {
      if (mountedRef.current) {
        console.error('Validation exception:', err);
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      validationInProgressRef.current = false;
    }
  }, []);

  // Auto-fill and validate code from URL (QR code scan)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && !hasAutoValidatedRef.current && step === 'code') {
      hasAutoValidatedRef.current = true;
      const upperCode = codeFromUrl.toUpperCase();
      setAccessCode(upperCode);
      // Validate immediately without setTimeout to avoid race conditions
      validateCode(upperCode);
    }
  }, [searchParams, step, validateCode]);


  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateCode(accessCode);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signUpSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (!validatedCode) {
      toast.error("Please validate your access code first");
      setStep('code');
      return;
    }

    setIsLoading(true);

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) {
      setIsLoading(false);
      toast.error(authError.message);
      return;
    }

    if (!authData.user) {
      setIsLoading(false);
      toast.error("Failed to create account");
      return;
    }

    // Update access code
    await supabase
      .from('access_codes')
      .update({
        status: 'used' as const,
        activated_by: authData.user.id,
        activated_at: new Date().toISOString(),
        bound_email: email,
        activations_used: 1,
      })
      .eq('id', validatedCode.id);

    // Calculate expiry
    const expiresAt = validatedCode.duration_days > 0
      ? new Date(Date.now() + validatedCode.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create enrollment
    await supabase
      .from('enrollments')
      .insert([{
        user_id: authData.user.id,
        access_code_id: validatedCode.id,
        grade: validatedCode.grade as any,
        stream: validatedCode.stream as any,
        medium: validatedCode.medium as any,
        tier: validatedCode.tier as any,
        expires_at: expiresAt,
      }]);

    setIsLoading(false);
    setStep('success');
    toast.success("Account created successfully!");
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-md mx-auto">
            {step === 'code' && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                    <Key className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Enter Access Code
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Enter the code from your purchased access card
                  </p>
                </div>

                <form onSubmit={handleValidateCode} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Access Code
                    </label>
                    <Input
                      type="text"
                      placeholder="SV-XXXXXXXX"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 font-mono tracking-wider"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="brand" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Validating..." : "Validate Code"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-center text-muted-foreground text-sm">
                    Already have an account?{" "}
                    <Link to="/auth" className="text-brand hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {step === 'signup' && validatedCode && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-1">
                    Code Validated
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Create your account to access your vault
                  </p>
                </div>

                {/* Enrollment Info */}
                <div className="bg-brand/10 border border-brand/20 rounded-lg p-3 mb-5">
                  <p className="text-xs text-muted-foreground mb-2">Your enrollment:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded bg-brand/20 text-brand text-xs font-medium">
                      {GRADE_LABELS[validatedCode.grade as keyof typeof GRADE_LABELS]}
                    </span>
                    <span className="px-2 py-1 rounded bg-brand/20 text-brand text-xs font-medium">
                      {STREAM_LABELS[validatedCode.stream as keyof typeof STREAM_LABELS]}
                    </span>
                    <span className="px-2 py-1 rounded bg-brand/20 text-brand text-xs font-medium">
                      {MEDIUM_LABELS[validatedCode.medium as keyof typeof MEDIUM_LABELS]}
                    </span>
                    <span className="px-2 py-1 rounded bg-brand/20 text-brand text-xs font-medium">
                      {TIER_LABELS[validatedCode.tier as keyof typeof TIER_LABELS]}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Email
                    </label>
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
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Password
                    </label>
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
                    <p className="text-xs text-muted-foreground mt-1.5">
                      This password will be used to encrypt your downloaded documents.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    variant="brand" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>

                <button 
                  onClick={() => setStep('code')}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to code entry
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="glass-card p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Welcome to {branding.siteName}!
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Your account is ready. Redirecting to your dashboard...
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

export default Access;
