import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
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
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mb-12">
              Last updated: December 17, 2024
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="animate-reveal" style={{ animationDelay: '0.1s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Notebase ("we," "our," or "us"). We are committed
                to protecting your personal information and your right to
                privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                educational platform and services.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.15s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                2. Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect information that you provide directly to us,
                including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Personal identification information (name, email address)</li>
                <li>Account credentials and authentication data</li>
                <li>Payment and billing information</li>
                <li>Device information and unique identifiers</li>
                <li>Usage data, including access patterns and content interactions</li>
                <li>IP addresses and location data</li>
                <li>Browser type and operating system information</li>
              </ul>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.2s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the collected information for various purposes, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Providing and maintaining our educational services</li>
                <li>Processing transactions and managing subscriptions</li>
                <li>Preventing fraud, unauthorized access, and abuse</li>
                <li>Enforcing device limits and access restrictions</li>
                <li>Improving our platform and developing new features</li>
                <li>Communicating with you about updates and promotions</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.25s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                4. Device Tracking & Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To protect our content and prevent unauthorized sharing, Notebase
                employs device fingerprinting and session tracking
                technologies. By using our services, you consent to the
                collection of device-specific information including browser
                fingerprints, hardware identifiers, and IP addresses. We reserve
                the right to limit or terminate access if suspicious activity or
                policy violations are detected.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.3s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                5. Data Sharing & Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>With service providers who assist in our operations</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, privacy, safety, or property</li>
                <li>In connection with a merger, acquisition, or sale of assets</li>
                <li>With your consent or at your direction</li>
              </ul>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.35s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                6. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to
                fulfill the purposes outlined in this policy, comply with legal
                obligations, resolve disputes, and enforce our agreements. Even
                after account termination, we may retain certain information for
                legitimate business purposes and legal compliance.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.4s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                7. Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Depending on your jurisdiction, you may have certain rights
                regarding your personal data. These rights may be limited where
                we have legitimate business interests or legal obligations. To
                exercise any rights, please contact us through our official
                channels.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.45s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                8. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Notebase reserves the right to update this Privacy Policy at
                any time. Changes will be effective immediately upon posting.
                Continued use of our services constitutes acceptance of the
                updated policy.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.5s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                9. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy, contact us at{' '}
                <a
                  href="mailto:ransibeats@gmail.com"
                  className="text-primary hover:underline"
                >
                  ransibeats@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
