import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Trash2,
  DollarSign,
  Users,
  Wallet,
  Percent,
  TrendingUp,
} from 'lucide-react';

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

const CommissionSettings = () => {
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [minimumPayout, setMinimumPayout] = useState<number>(10000);
  const [withdrawalFee, setWithdrawalFee] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTiers, setEditedTiers] = useState<Map<string, Partial<CommissionTier>>>(new Map());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch commission tiers
    const { data: tiersData } = await supabase
      .from('commission_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    if (tiersData) {
      setTiers(tiersData);
    }

    // Fetch platform settings
    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value');

    if (settingsData) {
      const minPayoutSetting = settingsData.find(s => s.setting_key === 'minimum_payout_lkr');
      const feeSetting = settingsData.find(s => s.setting_key === 'withdrawal_fee_percent');

      if (minPayoutSetting?.setting_value) {
        const value = typeof minPayoutSetting.setting_value === 'number' 
          ? minPayoutSetting.setting_value 
          : Number(minPayoutSetting.setting_value);
        setMinimumPayout(value);
      }

      if (feeSetting?.setting_value) {
        const value = typeof feeSetting.setting_value === 'number'
          ? feeSetting.setting_value
          : Number(feeSetting.setting_value);
        setWithdrawalFee(value);
      }
    }

    setIsLoading(false);
  };

  const handleTierChange = (tierId: string, field: keyof CommissionTier, value: any) => {
    const updated = new Map(editedTiers);
    const existing = updated.get(tierId) || {};
    updated.set(tierId, { ...existing, [field]: value });
    setEditedTiers(updated);
  };

  const getTierValue = (tier: CommissionTier, field: keyof CommissionTier) => {
    const edited = editedTiers.get(tier.id);
    if (edited && field in edited) {
      return edited[field];
    }
    return tier[field];
  };

  const handleSaveTiers = async () => {
    setIsSaving(true);

    try {
      // Update all edited tiers
      for (const [tierId, changes] of editedTiers.entries()) {
        const { error } = await supabase
          .from('commission_tiers')
          .update({
            tier_name: changes.tier_name,
            commission_rate: changes.commission_rate,
            monthly_user_threshold: changes.monthly_user_threshold,
          })
          .eq('id', tierId);

        if (error) throw error;
      }

      // Update platform settings
      await supabase
        .from('platform_settings')
        .upsert([
          { setting_key: 'minimum_payout_lkr', setting_value: minimumPayout },
          { setting_key: 'withdrawal_fee_percent', setting_value: withdrawalFee },
        ], { onConflict: 'setting_key' });

      toast.success('Settings saved successfully!');
      setEditedTiers(new Map());
      fetchData();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }

    setIsSaving(false);
  };

  const handleAddTier = async () => {
    const nextLevel = tiers.length > 0 ? Math.max(...tiers.map(t => t.tier_level)) + 1 : 1;
    const lastTier = tiers[tiers.length - 1];
    const newThreshold = lastTier ? lastTier.monthly_user_threshold + 250 : 0;
    const newRate = lastTier ? Math.min(lastTier.commission_rate + 2, 25) : 8;

    const { error } = await supabase
      .from('commission_tiers')
      .insert({
        tier_level: nextLevel,
        tier_name: `Tier ${nextLevel}`,
        commission_rate: newRate,
        monthly_user_threshold: newThreshold,
      });

    if (error) {
      toast.error('Failed to add tier');
    } else {
      toast.success('Tier added');
      fetchData();
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (tiers.length <= 1) {
      toast.error('Cannot delete the last tier');
      return;
    }

    const { error } = await supabase
      .from('commission_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      toast.error('Failed to delete tier');
    } else {
      toast.success('Tier deleted');
      fetchData();
    }
  };

  const hasChanges = editedTiers.size > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Commission & Payout Settings</h1>
              <p className="text-muted-foreground text-sm">Manage commission tiers and withdrawal settings</p>
            </div>
          </div>
          <Button
            variant="brand"
            onClick={handleSaveTiers}
            disabled={isSaving || !hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Commission Tiers */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand" />
                  Commission Tiers
                </h2>
                <Button variant="outline" size="sm" onClick={handleAddTier}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Tier
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Commission rates are based on <strong>monthly</strong> paid user conversions.
              </p>

              <div className="space-y-4">
                {tiers.map((tier, idx) => (
                  <div 
                    key={tier.id}
                    className="p-4 bg-secondary/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">Level {tier.tier_level}</span>
                      {tiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          onClick={() => handleDeleteTier(tier.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          value={getTierValue(tier, 'tier_name') as string}
                          onChange={(e) => handleTierChange(tier.id, 'tier_name', e.target.value)}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Rate (%)</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={getTierValue(tier, 'commission_rate') as number}
                            onChange={(e) => handleTierChange(tier.id, 'commission_rate', parseFloat(e.target.value))}
                            className="h-9 pr-8"
                          />
                          <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Min Users/Month</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            min="0"
                            value={getTierValue(tier, 'monthly_user_threshold') as number}
                            onChange={(e) => handleTierChange(tier.id, 'monthly_user_threshold', parseInt(e.target.value))}
                            className="h-9 pr-8"
                            disabled={idx === 0}
                          />
                          <Users className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout Settings */}
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
                  <Wallet className="w-5 h-5 text-brand" />
                  Payout Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Minimum Payout (LKR)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Creators must accumulate this amount before withdrawing
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        LKR
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={minimumPayout}
                        onChange={(e) => setMinimumPayout(parseInt(e.target.value))}
                        className="pl-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Withdrawal Fee (%)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Platform fee deducted from each withdrawal
                    </p>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={withdrawalFee}
                        onChange={(e) => setWithdrawalFee(parseFloat(e.target.value))}
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-foreground mb-4">Preview</h3>
                <div className="space-y-3 text-sm">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {getTierValue(tier, 'monthly_user_threshold') === 0 
                          ? 'Less than ' + (tiers[1]?.monthly_user_threshold || 100) + ' users/month'
                          : `${getTierValue(tier, 'monthly_user_threshold')}+ users/month`}
                      </span>
                      <span className="font-medium text-foreground">
                        {getTierValue(tier, 'commission_rate')}% commission
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Minimum withdrawal</span>
                      <span>LKR {minimumPayout.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Withdrawal fee</span>
                      <span>{withdrawalFee}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CommissionSettings;
