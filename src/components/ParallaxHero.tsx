import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, ArrowRight, GraduationCap, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useBranding } from "@/hooks/useBranding";

const ParallaxHero = () => {
  const [scrollY, setScrollY] = useState(0);
  const { branding } = useBranding();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background Layers */}
      <div 
        className="absolute inset-0 bg-vault-dark"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      />
      <div 
        className="absolute inset-0 hero-gradient"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      />
      
      {/* Animated grid pattern with parallax */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollY * 0.2}px)`
        }}
      />
      
      {/* Floating orbs with parallax */}
      <div 
        className="absolute top-1/4 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-brand/8 rounded-full blur-[120px] md:blur-[150px] animate-float"
        style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.15}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-brand/5 rounded-full blur-[100px] md:blur-[120px]"
        style={{ 
          transform: `translate(-${scrollY * 0.08}px, ${scrollY * 0.1}px)`,
          animationDelay: '2s' 
        }}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-20 pb-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="flex justify-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-glass/50 border border-brand/20 backdrop-blur-sm animate-slide-up">
              <GraduationCap className="w-4 h-4 text-brand" />
              <span className="text-xs md:text-sm text-muted-foreground font-body">For Sri Lankan O/L & A/L Students</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-6 md:mb-8 text-foreground tracking-[-0.04em] leading-[0.9] animate-slide-up"
            style={{ animationDelay: '0.1s', transform: `translateY(${scrollY * 0.1}px)` }}
            dangerouslySetInnerHTML={{ 
              __html: branding.heading.replace(
                /(base|base)/gi, 
                '<span class="text-brand-gradient">$1</span>'
              ) 
            }}
          />

          {/* Subheading */}
          <p 
            className="font-body text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 md:mb-12 max-w-2xl mx-auto text-balance leading-relaxed animate-slide-up px-4"
            style={{ animationDelay: '0.2s' }}
          >
            {branding.tagline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-16 md:mb-20 animate-slide-up px-4" style={{ animationDelay: '0.3s' }}>
            <Link to="/access" className="w-full sm:w-auto">
              <Button variant="brand" size="lg" className="gap-3 px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-semibold w-full sm:w-auto hover-glow">
                <Key className="w-4 md:w-5 h-4 md:h-5" />
                Enter Access Code
              </Button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="gap-2 px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-medium border-border/50 hover:bg-glass hover:border-brand/30 w-full sm:w-auto">
                View Plans
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div 
            className="flex flex-col items-center gap-3 animate-slide-up cursor-pointer group" 
            onClick={scrollToFeatures}
            style={{ animationDelay: '0.4s' }}
          >
            <span className="font-accent text-xs text-muted-foreground uppercase tracking-[0.2em]">Discover More</span>
            <div className="w-8 h-12 rounded-full border border-border/50 flex items-start justify-center p-2 group-hover:border-brand/50 transition-colors">
              <ChevronDown className="w-4 h-4 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParallaxHero;
