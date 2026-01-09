import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const RefundPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-reveal">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Refund Policy
            </h1>
            <p className="text-muted-foreground mb-12">
              Last updated: December 17, 2024
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="animate-reveal" style={{ animationDelay: '0.1s' }}>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
                <h3 className="font-display text-xl font-semibold text-primary mb-2">
                  Important Notice
                </h3>
                <p className="text-muted-foreground">
                  Due to the digital nature of our products and the immediate access provided upon purchase, all sales are generally considered final. Please read this policy carefully before making a purchase.
                </p>
              </div>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.15s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                1. General Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Notebase provides digital educational content that is accessible immediately upon activation of an access code. Due to the instant delivery nature of our digital products and the inability to "return" accessed content, we maintain a strict no-refund policy on all purchases unless otherwise specified in this document.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.2s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                2. No Refund Circumstances
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Refunds will NOT be provided for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Change of mind after purchase</li>
                <li>Failure to use the service during the subscription period</li>
                <li>Dissatisfaction with content quality (subjective opinions)</li>
                <li>Exam results or academic performance outcomes</li>
                <li>Incompatibility with personal devices (check requirements before purchase)</li>
                <li>Purchase of wrong tier or duration (upgrade options available)</li>
                <li>Account suspension or termination due to policy violations</li>
                <li>Duplicate purchases made in error</li>
                <li>Partial usage of the subscription period</li>
                <li>Internet connectivity or personal technical issues</li>
              </ul>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.25s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                3. Limited Refund Eligibility
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Refunds may be considered ONLY in the following exceptional circumstances, at our sole discretion:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Technical issues on our end that prevent access for more than 7 consecutive days, verified by our support team</li>
                <li>Unauthorized charges or fraudulent transactions (subject to investigation)</li>
                <li>Double billing errors confirmed by our billing system</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                All refund requests are subject to verification and approval. Meeting eligibility criteria does not guarantee a refund.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.3s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                4. Refund Request Process
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you believe you qualify for a refund:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
                <li>Submit a request within 48 hours of the issue occurring</li>
                <li>Email ransibeats@gmail.com with your account details, transaction ID, and detailed explanation</li>
                <li>Provide any relevant evidence (screenshots, error messages)</li>
                <li>Allow up to 14 business days for review</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Late requests or incomplete information may result in automatic denial.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.35s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                5. Refund Processing
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If a refund is approved, it will be processed to the original payment method within 14-30 business days. We are not responsible for delays caused by payment processors or banks. Refund amounts may be subject to administrative fees of up to 15% of the original purchase price.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.4s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                6. Upgrades
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                When upgrading to a higher tier, you pay only the difference between your current tier and the new tier. Upgrades are non-refundable. If you wish to change your subscription, we encourage you to use the upgrade feature rather than requesting refunds.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.45s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                7. Chargebacks
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Filing a chargeback or dispute with your payment provider without first attempting to resolve the issue with us directly will result in immediate account termination, permanent ban from our services, and potential legal action to recover costs including chargeback fees and content access value.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.5s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                8. Policy Modifications
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify this Refund Policy at any time without prior notice. Changes apply to all purchases made after the modification date. It is your responsibility to review this policy periodically.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.55s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                9. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                For refund inquiries or questions about this policy, please contact us at{' '}
                <a href="mailto:ransibeats@gmail.com" className="text-primary hover:underline">
                  ransibeats@gmail.com
                </a>
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By purchasing from Notebase, you acknowledge that you have read, understood, and agreed to this Refund Policy.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
