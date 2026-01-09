import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";
import { HelpCircle } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const Pricing = () => {
  const { branding } = useBranding();

  const faqs = [
    { question: "How do I get my access code?", answer: "Purchase an access card from Daraz. Each card contains a unique QR code that you can scan or enter manually on our access page." },
    { question: "Can I use my access on multiple devices?", answer: "Yes! Your access code works across all your devices. Simply log in from any browser to access your library." },
    { question: "Are the materials downloadable?", answer: `${branding.siteName} offers PDF downloads for offline study. All downloads are watermarked for security.` },
    { question: "What happens when my access expires?", answer: "You can renew your access or upgrade to Platinum for permanent access to all content and future updates." },
    { question: "How often is new content added?", answer: "We add new materials weekly. Gold and Platinum members get access to all new content automatically." }
  ];
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24" />
      <PricingSection />

      {/* FAQ Section */}
      <section className="py-20 md:py-24 bg-vault-surface">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Frequently Asked <span className="text-brand-gradient">Questions</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about {branding.siteName}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-card p-5 md:p-6 hover:border-brand/20 transition-all hover-lift">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Pricing;