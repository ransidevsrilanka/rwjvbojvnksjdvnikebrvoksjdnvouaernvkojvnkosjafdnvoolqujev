import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Json } from '@/integrations/supabase/types';
import { 
  ArrowLeft, 
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

type PricingConfig = Record<string, TierPricing>;

const tierKeys = ['starter', 'standard', 'lifetime'];

const defaultPricing: PricingConfig = {
  starter: {
    name: 'Silver',
    price: 1500,
    period: '1 year',
    description: 'Essential access for students',
    features: ['Access to all notes', 'Past papers', 'Basic support'],
  },
  standard: {
    name: 'Gold',
    price: 2500,
    period: '1 year',
    description: 'Enhanced learning experience',
    features: ['All Silver features', 'Premium content', 'Priority support', 'Study guides'],
  },
  lifetime: {
    name: 'Platinum',
    price: 5000,
    period: 'Forever',
    description: 'Ultimate lifetime access',
    features: ['All Gold features', 'Lifetime access', 'Exclusive content', 'VIP support', 'Early access'],
  },
};

const PricingSettings = () => {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle();

    if (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load pricing settings');
    } else if (data) {
      setPricing(data.value as unknown as PricingConfig);
    } else {
      // No pricing exists yet, use defaults
      setPricing(defaultPricing);
      setIsNewRecord(true);
    }
    setIsLoading(false);
  };

  const updateTierField = (tier: string, field: keyof TierPricing, value: string | number | string[]) => {
    if (!pricing) return;
    setPricing({
      ...pricing,
      [tier]: {
        ...pricing[tier],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!pricing) return;

    setIsSaving(true);
    
    let error;
    if (isNewRecord) {
      // Insert new record
      const result = await supabase
        .from('site_settings')
        .insert({ key: 'pricing', value: pricing as unknown as Json });
      error = result.error;
      if (!error) setIsNewRecord(false);
    } else {
      // Update existing record
      const result = await supabase
        .from('site_settings')
        .update({ value: pricing as unknown as Json })
        .eq('key', 'pricing');
      error = result.error;
    }

    if (error) {
      toast.error('Failed to save pricing settings');
      console.error(error);
    } else {
      toast.success('Pricing settings saved!');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!pricing) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Failed to load pricing settings.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-display text-lg font-semibold text-foreground">Pricing Settings</h1>
                <p className="text-muted-foreground text-sm">Manage package pricing displayed on the homepage</p>
              </div>
            </div>
            <Button variant="brand" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {tierKeys.map((tierKey) => {
            const tier = pricing[tierKey];
            return (
              <div key={tierKey} className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4 capitalize">
                  {tierKey} Tier ({tier.name})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                    <Input
                      value={tier.name}
                      onChange={(e) => updateTierField(tierKey, 'name', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price (Rs.)</label>
                    <Input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTierField(tierKey, 'price', Number(e.target.value))}
                      className="bg-secondary border-border"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Period</label>
                    <Input
                      value={tier.period}
                      onChange={(e) => updateTierField(tierKey, 'period', e.target.value)}
                      placeholder="e.g., 1 year, forever"
                      className="bg-secondary border-border"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <Input
                      value={tier.description}
                      onChange={(e) => updateTierField(tierKey, 'description', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Features (one per line)</label>
                  <Textarea
                    value={tier.features.join('\n')}
                    onChange={(e) => updateTierField(tierKey, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                    rows={4}
                    className="bg-secondary border-border"
                    placeholder="Enter features, one per line"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-brand/10 border border-brand/20 rounded-lg">
          <p className="text-sm text-foreground font-medium mb-1">Upgrade Pricing Formula</p>
          <p className="text-sm text-muted-foreground">
            When students upgrade, they pay: <span className="text-brand font-mono">(Target Tier Price - Current Tier Price) × 1.1</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Example: Upgrading from Silver (Rs. {pricing.starter.price}) to Platinum (Rs. {pricing.lifetime.price}) = 
            ({pricing.lifetime.price} - {pricing.starter.price}) × 1.1 = <span className="text-brand font-semibold">Rs. {Math.round((pricing.lifetime.price - pricing.starter.price) * 1.1).toLocaleString()}</span>
          </p>
        </div>
      </div>
    </main>
  );
};

export default PricingSettings;