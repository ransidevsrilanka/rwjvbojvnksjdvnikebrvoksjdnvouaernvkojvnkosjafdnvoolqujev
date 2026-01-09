import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandingSettings as BrandingSettingsType } from '@/types/database';

const defaultBranding: BrandingSettingsType = {
  siteName: 'StudyVAULT',
  logoText: 'SV',
  logoImage: null,
  heading: 'STUDYVAULT',
  tagline: 'Stream-based access to curated notes, past papers, and study materials. One code unlocks your entire curriculum.',
  pricingButtons: {
    starter: '/access',
    standard: '/access',
    lifetime: '/access',
  },
  bankDetails: {
    bankName: 'Bank of Ceylon',
    accountName: 'ReadVault Education',
    accountNumber: '1234567890',
    branch: 'Colombo Main',
  },
};

const BrandingSettings = () => {
  const [branding, setBranding] = useState<BrandingSettingsType>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'branding')
        .maybeSingle();

      if (error) {
        console.error('Failed to load branding:', error);
        return;
      }

      if (data?.value) {
        setBranding(data.value as unknown as BrandingSettingsType);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First check if branding exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'branding')
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from('site_settings')
          .update({
            value: JSON.parse(JSON.stringify(branding)),
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'branding');
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('site_settings')
          .insert([{
            key: 'branding',
            value: JSON.parse(JSON.stringify(branding)),
          }]);
        error = result.error;
      }

      if (error) throw error;
      toast.success('Branding settings saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setBranding(prev => ({ ...prev, logoImage: publicUrl }));
      toast.success('Logo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = () => {
    setBranding(prev => ({ ...prev, logoImage: null }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* Header */}
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Branding Settings</h1>
                <p className="text-sm text-muted-foreground">Customize your site appearance</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving} variant="brand">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Site Identity */}
        <section className="glass-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Site Identity</h2>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website Name
              </label>
              <Input
                value={branding.siteName}
                onChange={(e) => setBranding(prev => ({ ...prev, siteName: e.target.value }))}
                placeholder="StudyVAULT"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will appear in the navbar and throughout the site
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Logo Text (2-3 characters)
              </label>
              <Input
                value={branding.logoText}
                onChange={(e) => setBranding(prev => ({ ...prev, logoText: e.target.value.slice(0, 3) }))}
                placeholder="SV"
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shown when no logo image is set (e.g., "SV")
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Logo Image
              </label>
              <div className="flex items-center gap-4">
                {branding.logoImage ? (
                  <div className="relative">
                    <img
                      src={branding.logoImage}
                      alt="Logo"
                      className="w-16 h-16 rounded-lg object-contain bg-secondary border border-border"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary border border-dashed border-border flex items-center justify-center">
                    <Image className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB. Recommended: 200x200px
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="glass-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Homepage Hero</h2>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Main Heading
              </label>
              <Input
                value={branding.heading}
                onChange={(e) => setBranding(prev => ({ ...prev, heading: e.target.value }))}
                placeholder="STUDYVAULT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tagline / Subheading
              </label>
              <Textarea
                value={branding.tagline}
                onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="Your catchy tagline..."
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Pricing Buttons */}
        <section className="glass-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Pricing Page Buttons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set where each tier's "Get" button leads. Use "/access" for internal page or a full URL for external links (e.g., Daraz product page).
          </p>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Silver Tier Button URL
              </label>
              <Input
                value={branding.pricingButtons.starter}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  pricingButtons: { ...prev.pricingButtons, starter: e.target.value }
                }))}
                placeholder="/access or https://daraz.lk/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gold Tier Button URL
              </label>
              <Input
                value={branding.pricingButtons.standard}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  pricingButtons: { ...prev.pricingButtons, standard: e.target.value }
                }))}
                placeholder="/access or https://daraz.lk/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Platinum Tier Button URL
              </label>
              <Input
                value={branding.pricingButtons.lifetime}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  pricingButtons: { ...prev.pricingButtons, lifetime: e.target.value }
                }))}
                placeholder="/access or https://daraz.lk/..."
              />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Bank Transfer Details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bank account details shown to users for bank transfer payments.
          </p>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bank Name
              </label>
              <Input
                value={branding.bankDetails?.bankName || ''}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  bankDetails: { ...prev.bankDetails!, bankName: e.target.value }
                }))}
                placeholder="Bank of Ceylon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Account Name
              </label>
              <Input
                value={branding.bankDetails?.accountName || ''}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  bankDetails: { ...prev.bankDetails!, accountName: e.target.value }
                }))}
                placeholder="ReadVault Education"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Account Number
              </label>
              <Input
                value={branding.bankDetails?.accountNumber || ''}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  bankDetails: { ...prev.bankDetails!, accountNumber: e.target.value }
                }))}
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Branch
              </label>
              <Input
                value={branding.bankDetails?.branch || ''}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  bankDetails: { ...prev.bankDetails!, branch: e.target.value }
                }))}
                placeholder="Colombo Main"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default BrandingSettings;
