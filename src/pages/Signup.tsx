import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Signup redirect page
 * Captures referral parameters and redirects to pricing page
 * This ensures creator referral links work: /signup?ref_creator=CODE
 */
const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCreator = searchParams.get('ref_creator');
    const discountCode = searchParams.get('discount_code');

    // Build the redirect URL with preserved params
    const params = new URLSearchParams();
    if (refCreator) params.set('ref_creator', refCreator);
    if (discountCode) params.set('discount_code', discountCode);

    const queryString = params.toString();
    const redirectUrl = queryString ? `/pricing?${queryString}` : '/pricing';

    // Redirect to pricing page with params preserved
    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  // Show brief loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to signup...</p>
      </div>
    </div>
  );
};

export default Signup;
