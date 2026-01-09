import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, Users, Shield, Sparkles, Target, Heart, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";

const values = [
  { icon: BookOpen, title: "Quality Curation", description: "Every resource is carefully selected and organized to ensure maximum learning value." },
  { icon: Users, title: "Accessible Learning", description: "We believe quality education should be affordable and accessible to everyone." },
  { icon: Shield, title: "Trust & Security", description: "Your access is protected with secure authentication and reliable service." },
  { icon: Sparkles, title: "Continuous Growth", description: "Regular updates ensure your library stays current and comprehensive." }
];

const About = () => {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { branding } = useBranding();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('active');
        });
      },
      { threshold: 0.2 }
    );
    cardsRef.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-20 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 mb-8 animate-slide-up">
              <Heart className="w-4 h-4 text-brand" />
              <span className="text-brand text-sm font-medium">About {branding.siteName}</span>
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Empowering Learners Through <span className="text-brand-gradient">Organized Knowledge</span>
            </h1>
            
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {branding.siteName} was born from a simple belief: that quality educational resources 
              should be organized, accessible, and affordable for students across Sri Lanka.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-24 bg-vault-surface">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-brand" />
                <span className="text-brand text-sm font-medium uppercase tracking-wider font-accent">Our Mission</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6">
                Democratizing Access to Knowledge
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                We understand the challenges students face in finding quality educational materials. 
                {branding.siteName} bridges this gap by providing a centralized, well-organized library at an affordable cost.
              </p>
            </div>
            
            <div className="glass-card p-6 md:p-8 hover-glow">
              <div className="grid grid-cols-2 gap-6">
                {[{ stat: "1000+", label: "Curated Resources" }, { stat: "5", label: "Streams" }, { stat: "Weekly", label: "New Additions" }, { stat: "24/7", label: "Access Available" }].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="font-display text-3xl md:text-4xl font-bold text-brand mb-2">{item.stat}</div>
                    <p className="text-muted-foreground text-sm">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Our <span className="text-brand-gradient">Values</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div 
                key={index} 
                ref={(el) => (cardsRef.current[index] = el)}
                className="reveal glass-card p-6 hover:border-brand/30 transition-all hover-lift"
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24 bg-vault-surface relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start <span className="text-brand-gradient">Learning</span>?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of learners who have discovered the value of organized, accessible educational resources.
          </p>
          <Link to="/pricing">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand text-primary-foreground font-semibold hover:bg-brand-light hover-glow transition-all">
              Get Your Access Card
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default About;