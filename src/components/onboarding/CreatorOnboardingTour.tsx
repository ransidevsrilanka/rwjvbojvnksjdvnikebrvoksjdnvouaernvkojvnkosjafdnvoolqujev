import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Link as LinkIcon,
  DollarSign,
  Tag,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Award,
  TrendingUp,
  Sparkles,
  Rocket,
  Heart,
  Star,
  Zap,
  Gift,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

interface CreatorOnboardingTourProps {
  referralCode: string;
  onComplete: () => void;
}

const CreatorOnboardingTour = ({ referralCode, onComplete }: CreatorOnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [minimumPayout, setMinimumPayout] = useState(10000);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Fetch commission tiers
    const { data: tiersData } = await supabase
      .from('commission_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    if (tiersData) {
      setCommissionTiers(tiersData);
    }

    // Fetch minimum payout
    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'minimum_payout_lkr')
      .maybeSingle();

    if (settingsData?.setting_value) {
      const value = typeof settingsData.setting_value === 'number' 
        ? settingsData.setting_value 
        : Number(settingsData.setting_value);
      setMinimumPayout(value);
    }

    setIsLoading(false);
  };

  const referralLink = `${window.location.origin}/signup?ref_creator=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied! Now go share it! 🚀');
  };

  // Get tier 2 for the default tier info
  const tier2 = commissionTiers.find(t => t.tier_level === 2);
  const tier1 = commissionTiers.find(t => t.tier_level === 1);
  const tier2Rate = tier2?.commission_rate || 12;
  const tier2Threshold = tier2?.monthly_user_threshold || 100;
  const tier1Rate = tier1?.commission_rate || 8;

  // Calculate users needed for minimum payout at tier 2 rate
  // Package price = 1500 LKR, Commission = 12% = 180 LKR per user
  const usersForMinPayout = Math.ceil(minimumPayout / (1500 * (tier2Rate / 100)));

  const steps = [
    {
      title: 'Welcome to the Family! 🎉',
      icon: Heart,
      content: (
        <div className="space-y-4">
          <p className="text-lg text-foreground">
            Hey there, superstar! 🌟
          </p>
          <p className="text-muted-foreground">
            You just joined something amazing. We're not just a platform — we're a <strong className="text-foreground">community of creators</strong> helping students succeed while earning some serious side income.
          </p>
          <div className="bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-lg p-4 border border-brand/30">
            <p className="text-sm text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              Let's get you set up in 2 minutes. Ready? Let's go!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Your 30-Day Head Start! 🚀',
      icon: Rocket,
      content: (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-green-400" />
              <span className="font-bold text-green-400">WELCOME BONUS</span>
            </div>
            <p className="text-foreground font-medium">
              You start at <span className="text-green-400 text-xl">{tier2Rate}% commission</span> for your first 30 days!
            </p>
          </div>
          
          <p className="text-muted-foreground">
            That's right — you get our <strong className="text-foreground">Tier 2 rate</strong> from day one. No proving yourself first. We believe in you! 💪
          </p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-sm text-amber-300">
              <strong>Keep it going:</strong> Bring {tier2Threshold}+ paid students per month and you'll stay at {tier2Rate}% forever!
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            If you dip below {tier2Threshold} users after 30 days, you'll move to base tier ({tier1Rate}%) until you pick up again. No pressure — you've got this! 
          </p>
        </div>
      ),
    },
    {
      title: 'How the Magic Works ✨',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            It's simpler than you think. Share → They buy → You earn. Forever.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📣</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Share your link anywhere</p>
                <p className="text-xs text-muted-foreground">Instagram, WhatsApp, TikTok, your mom's friend group... 😉</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Student signs up & pays</p>
                <p className="text-xs text-muted-foreground">They get amazing notes, you get credited automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Money hits your balance</p>
                <p className="text-xs text-muted-foreground">Watch it grow. Withdraw whenever you want!</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            🔒 Once a student is yours, they're yours <strong>forever</strong>. Any future purchases = more commissions for you!
          </p>
        </div>
      ),
    },
    {
      title: 'Level Up Your Earnings! 📈',
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The more students you help, the more you earn per sale. Simple!
          </p>
          <div className="space-y-2">
            {commissionTiers.map((tier, idx) => (
              <div 
                key={tier.id} 
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  idx === 1 ? 'border-green-500/50 bg-green-500/10 ring-1 ring-green-500/30' : 
                  idx === 0 ? 'border-border bg-secondary/30' : 
                  'border-brand/30 bg-brand/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    idx === 0 ? 'bg-muted' : 
                    idx === 1 ? 'bg-green-500/20' : 
                    idx === 2 ? 'bg-purple-500/20' : 'bg-brand/20'
                  }`}>
                    {idx === 0 ? '🌱' : idx === 1 ? '⚡' : idx === 2 ? '🔥' : '👑'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      {tier.tier_name}
                      {idx === 1 && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">YOU START HERE</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.monthly_user_threshold === 0 
                        ? 'Below target' 
                        : `${tier.monthly_user_threshold}+ students/month`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${idx === 1 ? 'text-green-400' : 'text-foreground'}`}>
                    {tier.commission_rate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            💡 Your tier is calculated on a rolling 30-day window. Bring more students, earn more!
          </p>
        </div>
      ),
    },
    {
      title: 'Your Money-Making Link 🔗',
      icon: LinkIcon,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is YOUR link. Guard it, share it, love it. Every click could mean $$$.
          </p>
          <div className="bg-secondary rounded-lg p-4 border border-brand/30">
            <p className="text-xs text-muted-foreground mb-2">✨ Your Personal Referral Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-foreground bg-background rounded px-3 py-2 overflow-x-auto border border-border">
                {referralLink}
              </code>
              <Button
                variant="brand"
                size="sm"
                onClick={() => copyToClipboard(referralLink)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-sm text-purple-300">
              🎯 <strong>Pro tip:</strong> Your code is <strong className="text-purple-200">{referralCode}</strong> — students can enter this at checkout too!
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Link tracked securely • Instant attribution
          </div>
        </div>
      ),
    },
    {
      title: 'Bonus: Discount Codes! 🏷️',
      icon: Tag,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Want to sweeten the deal for students? Use your discount code!
          </p>
          <div className="bg-secondary/50 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">🎁</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Your discount code gives students:</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <strong>10% off</strong> their purchase
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Sale still <strong>credited to you</strong>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <strong>Higher conversions</strong> (everyone loves discounts!)
              </li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Find your discount codes in your dashboard → Great for hesitant buyers!
          </p>
        </div>
      ),
    },
    {
      title: 'Cash Out Time! 💸',
      icon: Wallet,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Made some money? Let's get it to you. It's your hard-earned cash!
          </p>
          
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Minimum to withdraw</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              LKR {minimumPayout.toLocaleString()}
            </p>
            <p className="text-sm text-green-300 mt-1">
              That's just <strong>~{usersForMinPayout} happy students</strong> from you! 🎉
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border">
              <span className="text-2xl mb-2 block">🏦</span>
              <p className="text-sm font-medium text-foreground">Bank Transfer</p>
              <p className="text-xs text-muted-foreground">Any Sri Lankan bank</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border">
              <span className="text-2xl mb-2 block">₿</span>
              <p className="text-sm font-medium text-foreground">Crypto</p>
              <p className="text-xs text-muted-foreground">USDT, BTC & more</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Withdrawals processed within 24-48 hours • Fast & secure
          </p>
        </div>
      ),
    },
    {
      title: "You're Ready to Rock! 🤘",
      icon: Award,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-brand to-purple-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-4xl">🚀</span>
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              You've got everything you need!
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm bg-secondary/50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-foreground">30 days of {tier2Rate}% commission — make the most of it!</span>
            </div>
            <div className="flex items-center gap-3 text-sm bg-secondary/50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-foreground">Your link & code ready to share</span>
            </div>
            <div className="flex items-center gap-3 text-sm bg-secondary/50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-foreground">Real-time earnings tracking on your dashboard</span>
            </div>
            <div className="flex items-center gap-3 text-sm bg-secondary/50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-foreground">Multiple withdrawal options</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-lg p-4 text-center border border-brand/30">
            <p className="text-sm font-medium text-foreground">
              Go share that link and start earning! 🎯
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your first commission is just one share away...
            </p>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentIcon = steps[currentStep].icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-brand mx-auto animate-pulse mb-2" />
          <p className="text-muted-foreground">Preparing your welcome tour...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Card */}
        <div className="glass-card p-6 border border-border/50">
          {/* Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-brand/30">
              <CurrentIcon className="w-8 h-8 text-brand" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {steps[currentStep].title}
            </h2>
          </div>

          {/* Content */}
          <div className="mb-8 min-h-[280px]">
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              variant="brand"
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Let's Go!
                  <Rocket className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip button */}
        {currentStep < steps.length - 1 && (
          <div className="text-center mt-4">
            <button
              onClick={onComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour (but you'll miss the fun stuff!)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorOnboardingTour;