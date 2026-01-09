import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user, isAdmin, isCMO, isCreator, enrollment, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // SPA-safe redirect: never navigate during render.
  // Role-based redirection: admin → /admin, CMO → /cmo/dashboard, creator → /creator/dashboard, student → /dashboard
  useEffect(() => {
    if (!user || authLoading) return;

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    
    // Determine the correct destination based on role
    let destination = '/activate'; // Default for students without enrollment
    
    if (isAdmin) {
      destination = from || '/admin';
    } else if (isCMO) {
      destination = '/cmo/dashboard';
    } else if (isCreator) {
      destination = '/creator/dashboard';
    } else if (enrollment) {
      // Student with valid enrollment
      destination = from || '/dashboard';
    }
    
    navigate(destination, { replace: true });
  }, [user, authLoading, isAdmin, isCMO, isCreator, enrollment, navigate, location.state]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Invalid credentials');
    } else {
      toast.success('Welcome back!');
    }
  };

  if (user && !authLoading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-sm mx-auto">
            <div className="glass-card p-6 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
                  <LogIn className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mb-1">
                  Welcome Back
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sign in to access your vault
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
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
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t border-border text-center space-y-3">
                <Link to="/forgot-password" className="text-brand hover:underline text-sm block">
                  Forgot your password?
                </Link>
                <p className="text-muted-foreground text-sm">
                  Don't have an account?{' '}
                  <Link to="/access" className="text-brand hover:underline">
                    Enter access code
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Auth;

