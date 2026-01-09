import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to send reset email');
    } else {
      setIsSuccess(true);
      toast.success('Password reset email sent!');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-sm mx-auto">
            <div className="glass-card p-6 animate-fade-in">
              {isSuccess ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h1 className="font-display text-xl font-bold text-foreground mb-2">
                    Check Your Email
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Please check your inbox and spam folder.
                  </p>
                  <Link to="/auth">
                    <Button variant="brand" className="w-full">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h1 className="font-display text-xl font-bold text-foreground mb-1">
                      Forgot Password?
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
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

                    <Button
                      type="submit"
                      variant="brand"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>

                  <div className="mt-5 pt-5 border-t border-border text-center">
                    <Link 
                      to="/auth" 
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ForgotPassword;
