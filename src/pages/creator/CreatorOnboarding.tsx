import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CreatorOnboardingTour from '@/components/onboarding/CreatorOnboardingTour';
import { toast } from 'sonner';

const CreatorOnboarding = () => {
  const { user, isCreator } = useAuth();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isCreator) {
      navigate('/');
      return;
    }

    checkOnboardingStatus();
  }, [isCreator, navigate, user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    // Check if already completed onboarding
    const { data: onboardingData } = await supabase
      .from('creator_onboarding')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (onboardingData?.completed_at) {
      // Already completed, redirect to dashboard
      navigate('/creator/dashboard');
      return;
    }

    // Get creator profile for referral code
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creatorProfile?.referral_code) {
      setReferralCode(creatorProfile.referral_code);
    }

    setIsLoading(false);
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      // Upsert onboarding record as complete
      await supabase
        .from('creator_onboarding')
        .upsert({
          user_id: user.id,
          completed_at: new Date().toISOString(),
          current_step: 7,
        }, { onConflict: 'user_id' });

      toast.success('Welcome to the Creator Program!');
      navigate('/creator/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate even if save fails
      navigate('/creator/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <CreatorOnboardingTour
      referralCode={referralCode}
      onComplete={handleComplete}
    />
  );
};

export default CreatorOnboarding;
