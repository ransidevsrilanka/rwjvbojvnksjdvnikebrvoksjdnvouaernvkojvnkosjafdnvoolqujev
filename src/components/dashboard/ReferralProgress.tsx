import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Gift, Users, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';

const REFERRAL_GOAL = 5;

interface ReferralReward {
  id: string;
  referral_count: number;
  unlocked_tier: string | null;
  is_claimed: boolean;
  expires_at: string | null;
}

const ReferralProgress = () => {
  const { user, enrollment } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [reward, setReward] = useState<ReferralReward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchReferralData = async () => {
      // Get count of paid referrals (users who signed up with this user's referral and paid)
      const { data: attributions, error: attrError } = await supabase
        .from('user_attributions')
        .select('id, user_id')
        .eq('referral_source', user.id);

      if (!attrError && attributions) {
        // Check how many of these referrals have made a payment
        const referralUserIds = attributions.map(a => a.user_id);
        
        if (referralUserIds.length > 0) {
          const { count } = await supabase
            .from('payment_attributions')
            .select('*', { count: 'exact', head: true })
            .in('user_id', referralUserIds);
          
          setReferralCount(count || 0);
        }
      }

      // Check for existing reward
      const { data: rewardData } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (rewardData) {
        setReward(rewardData);
      }

      setIsLoading(false);
    };

    fetchReferralData();
  }, [user]);

  const handleClaimReward = async () => {
    if (!reward || reward.is_claimed || !enrollment) return;

    setIsClaiming(true);
    
    // Upgrade user's enrollment to standard tier
    const { error } = await supabase
      .from('enrollments')
      .update({ tier: 'standard' })
      .eq('id', enrollment.id);

    if (error) {
      toast.error('Failed to claim reward');
      setIsClaiming(false);
      return;
    }

    // Mark reward as claimed
    await supabase
      .from('referral_rewards')
      .update({ is_claimed: true })
      .eq('id', reward.id);

    toast.success('🎉 Congratulations! You\'ve been upgraded to Standard tier!');
    setReward({ ...reward, is_claimed: true });
    setIsClaiming(false);

    // Refresh the page to update enrollment
    window.location.reload();
  };

  if (isLoading) return null;

  // Don't show if user already has standard or lifetime tier
  if (enrollment?.tier === 'standard' || enrollment?.tier === 'lifetime') {
    return null;
  }

  const progress = Math.min((referralCount / REFERRAL_GOAL) * 100, 100);
  const isUnlocked = referralCount >= REFERRAL_GOAL;

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isUnlocked ? 'bg-gold/20' : 'bg-brand/10'
          }`}>
            {isUnlocked ? (
              <Crown className="w-5 h-5 text-gold" />
            ) : (
              <Gift className="w-5 h-5 text-brand" />
            )}
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Refer Friends, Get Premium Free!
            </h3>
            <p className="text-sm text-muted-foreground">
              {isUnlocked 
                ? 'You\'ve unlocked Standard tier! Claim it now.' 
                : `Refer ${REFERRAL_GOAL} friends who purchase any package`
              }
            </p>
          </div>
        </div>

        {isUnlocked && reward && !reward.is_claimed && (
          <button
            onClick={handleClaimReward}
            disabled={isClaiming}
            className="px-4 py-2 bg-gold text-background font-medium rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {isClaiming ? 'Claiming...' : 'Claim Reward 🎁'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">
              {referralCount} of {REFERRAL_GOAL} friends referred
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: REFERRAL_GOAL }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < referralCount ? 'text-gold fill-gold' : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {!isUnlocked && (
          <p className="text-xs text-muted-foreground mt-2">
            Share your referral link with friends. When they sign up and purchase any package, 
            you get credit! After {REFERRAL_GOAL} paid referrals, you'll unlock Standard tier for free.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReferralProgress;
