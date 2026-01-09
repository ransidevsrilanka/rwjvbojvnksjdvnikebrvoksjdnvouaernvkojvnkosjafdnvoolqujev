import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BrandingSettings } from '@/types/database';

const defaultBranding: BrandingSettings = {
  siteName: 'Course Master',
  logoText: null,
  logoImage: null,
  heading: 'Course Master',
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

export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);

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
        setBranding(data.value as unknown as BrandingSettings);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { branding, isLoading, refetch: fetchBranding };
};
