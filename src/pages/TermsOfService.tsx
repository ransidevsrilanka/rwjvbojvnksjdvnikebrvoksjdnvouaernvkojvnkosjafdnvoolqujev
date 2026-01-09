import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const TermsOfService = () => {
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
              Terms of Service
            </h1>
            <p className="text-muted-foreground mb-12">
              Last updated: December 17, 2024
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="animate-reveal" style={{ animationDelay: '0.1s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Notebase ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you must not use our services. We reserve the right to modify these terms at any time without prior notice. Continued use of the Service constitutes acceptance of any modifications.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.15s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                2. Account Registration & Eligibility
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use our services, you must:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Be at least 13 years of age (or have parental consent)</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept full responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to refuse service, terminate accounts, or remove content at our sole discretion without prior notice or liability.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.2s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                3. Access Codes & Subscriptions
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Access to our content is granted through access codes which are:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Non-transferable and for single-user use only</li>
                <li>Bound to the activating device and email address</li>
                <li>Subject to device limits as specified in your tier</li>
                <li>Valid only for the duration and content specified</li>
                <li>Subject to immediate revocation if terms are violated</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Sharing, reselling, or distributing access codes is strictly prohibited and will result in immediate account termination without refund.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.25s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                4. Intellectual Property Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on Notebase, including but not limited to study notes, videos, graphics, logos, and software, is the exclusive property of Notebase or its licensors and is protected by copyright and intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access content for personal, non-commercial educational use only. Any reproduction, distribution, modification, public display, or commercial exploitation of our content is strictly prohibited and may result in legal action.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.3s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                5. Prohibited Conduct
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Share, copy, redistribute, or sell any content</li>
                <li>Use screen recording, screenshots, or other capture methods</li>
                <li>Attempt to bypass device restrictions or security measures</li>
                <li>Share account credentials with others</li>
                <li>Use VPNs or proxies to circumvent geographic restrictions</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Use automated systems to access the service</li>
                <li>Engage in any activity that disrupts or interferes with the service</li>
              </ul>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.35s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                6. Content Accuracy & Disclaimer
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to provide accurate and up-to-date educational content, we make no warranties or representations regarding the accuracy, completeness, or reliability of any content. Our materials are supplementary and should not replace official curriculum or textbooks. We are not responsible for any errors, omissions, or outcomes resulting from the use of our content. Use of our materials is at your own risk.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.4s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOTEBASE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OR INABILITY TO USE THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.45s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                8. Indemnification
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless Notebase, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including legal fees) arising from your use of the service, violation of these terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.5s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                9. Account Termination
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or without cause, with or without notice. Upon termination, your right to use the service immediately ceases. All provisions of these terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.55s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                10. Dispute Resolution
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration in Sri Lanka. You waive any right to participate in class action lawsuits or class-wide arbitration. The prevailing party shall be entitled to recover reasonable legal fees and costs.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.6s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                11. Governing Law
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Sri Lanka, without regard to conflict of law principles. Any legal action must be brought in the courts of Sri Lanka.
              </p>
            </section>

            <section className="animate-reveal" style={{ animationDelay: '0.65s' }}>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                12. Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:ransibeats@gmail.com" className="text-primary hover:underline">
                  support@coursemaster.store
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

export default TermsOfService;
