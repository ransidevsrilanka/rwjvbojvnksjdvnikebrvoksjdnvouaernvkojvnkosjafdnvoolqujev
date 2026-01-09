import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  LogOut, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Globe,
  Monitor,
} from 'lucide-react';

interface PaymentMode {
  mode: 'test' | 'live';
  test_environment: 'localhost' | 'web';
}

const PaymentSettings = () => {
  const { user, signOut } = useAuth();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>({
    mode: 'test',
    test_environment: 'web',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmLive, setShowConfirmLive] = useState(false);

  useEffect(() => {
    fetchPaymentMode();
  }, []);

  const fetchPaymentMode = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_mode')
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment mode:', error);
        return;
      }

      if (data?.value && typeof data.value === 'object' && 'mode' in data.value) {
        setPaymentMode(data.value as unknown as PaymentMode);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeToggle = (isLive: boolean) => {
    if (isLive && paymentMode.mode !== 'live') {
      setShowConfirmLive(true);
    } else {
      setPaymentMode(prev => ({ ...prev, mode: isLive ? 'live' : 'test' }));
    }
  };

  const confirmLiveMode = () => {
    setPaymentMode(prev => ({ ...prev, mode: 'live' }));
    setShowConfirmLive(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if setting exists first
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'payment_mode')
        .maybeSingle();

      const jsonValue = JSON.parse(JSON.stringify(paymentMode));

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: jsonValue })
          .eq('key', 'payment_mode');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert([{ key: 'payment_mode', value: jsonValue }]);
        if (error) throw error;
      }

      toast.success(`Payment mode set to ${paymentMode.mode === 'live' ? 'LIVE' : `TEST (${paymentMode.test_environment})`}`);
    } catch (err) {
      console.error('Error saving payment mode:', err);
      toast.error('Failed to save payment settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-display text-xl font-bold text-foreground">Payment Settings</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Current Mode Status */}
        <div className={`glass-card p-6 mb-6 border ${paymentMode.mode === 'live' ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMode.mode === 'live' ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
              {paymentMode.mode === 'live' ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {paymentMode.mode === 'live' ? 'LIVE Mode' : 'TEST Mode'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {paymentMode.mode === 'live' 
                  ? 'Real payments are being processed'
                  : `Sandbox payments (${paymentMode.test_environment})`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="text-foreground font-medium">Live Mode</Label>
                <p className="text-xs text-muted-foreground">Process real payments with real money</p>
              </div>
            </div>
            <Switch
              checked={paymentMode.mode === 'live'}
              onCheckedChange={handleModeToggle}
            />
          </div>

          {/* Test Environment Selection */}
          {paymentMode.mode === 'test' && (
            <div className="border-t border-border pt-6 animate-fade-in">
              <Label className="text-foreground font-medium mb-4 block">Test Environment</Label>
              <RadioGroup
                value={paymentMode.test_environment}
                onValueChange={(value) => setPaymentMode(prev => ({ ...prev, test_environment: value as 'localhost' | 'web' }))}
                className="space-y-3"
              >
                <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  paymentMode.test_environment === 'localhost' 
                    ? 'bg-brand/10 border-brand/40' 
                    : 'bg-secondary/50 border-border hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="localhost" />
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-foreground">Localhost</span>
                    <p className="text-xs text-muted-foreground">For local development (localhost:3000)</p>
                  </div>
                </label>
                
                <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  paymentMode.test_environment === 'web' 
                    ? 'bg-brand/10 border-brand/40' 
                    : 'bg-secondary/50 border-border hover:border-muted-foreground/30'
                }`}>
                  <RadioGroupItem value="web" />
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-foreground">Web (Sandbox)</span>
                    <p className="text-xs text-muted-foreground">For testing on deployed staging site</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Credential Info */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Active Credentials</h3>
            <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              {paymentMode.mode === 'live' ? (
                <>
                  <p>• PAYHERE_MERCHANT_ID</p>
                  <p>• PAYHERE_MERCHANT_SECRET</p>
                  <p>• PAYHERE_APP_ID</p>
                  <p>• PAYHERE_APP_SECRET</p>
                </>
              ) : paymentMode.test_environment === 'localhost' ? (
                <>
                  <p>• PAYHERE_MERCHANT_SANDOBOX_ID</p>
                  <p>• PAYHERE_MERCHANT_SECRET_SANDBOX_LOCALHOST</p>
                  <p>• PAYHERE_SANDBOX_APP_ID</p>
                  <p>• PAYHERE_SANDBOX_APP_SECRET</p>
                </>
              ) : (
                <>
                  <p>• PAYHERE_MERCHANT_SANDOBOX_ID</p>
                  <p>• PAYHERE_MERCHANT_SANDBOX_SECRET_WEB</p>
                  <p>• PAYHERE_SANDBOX_APP_ID</p>
                  <p>• PAYHERE_SANDBOX_APP_SECRET</p>
                </>
              )}
            </div>
          </div>

          <Button 
            variant="brand" 
            className="w-full" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {/* Live Mode Warning */}
        {paymentMode.mode === 'live' && (
          <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Production Warning</p>
                <p className="text-sm opacity-80">
                  Live mode processes real payments. Ensure all testing is complete before enabling this mode.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Live Mode Dialog */}
      {showConfirmLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Enable Live Mode?</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              This will enable real payment processing. All transactions will use real money. 
              Are you sure you want to continue?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowConfirmLive(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1" 
                onClick={confirmLiveMode}
              >
                Enable Live Mode
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default PaymentSettings;
