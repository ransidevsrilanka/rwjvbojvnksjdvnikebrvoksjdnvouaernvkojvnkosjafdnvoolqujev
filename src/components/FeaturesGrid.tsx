import { useEffect, useRef } from "react";
import { BookOpen, Shield, GraduationCap, Sparkles } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Stream-Locked",
    description: "Access your entire stream's subjects. Maths, Biology, Commerce, Arts, or Technology — everything in one place.",
    number: "01"
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "QR code activation binds to your account. One code, one student, maximum protection for your investment.",
    number: "02"
  },
  {
    icon: GraduationCap,
    title: "Curriculum Aligned",
    description: "Content structured exactly as your syllabus. O/L and A/L materials organized for efficient, focused learning.",
    number: "03"
  }
];

const FeaturesGrid = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="py-24 md:py-32 lg:py-40 bg-vault-dark relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-vault-dark to-vault-surface" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
      
      {/* Floating orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-24">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 mb-6">
            <Sparkles className="w-4 h-4 text-brand" />
            <span className="font-accent text-sm text-brand uppercase tracking-wider">Core Features</span>
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
            What Makes Us <span className="text-brand-gradient">Different</span>
          </h2>
          <p className="font-body text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Built specifically for Sri Lankan students. No fluff, just the essentials you need to excel.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              ref={(el) => (cardsRef.current[index] = el)}
              className="reveal group relative"
              style={{ transitionDelay: `${index * 0.15}s` }}
            >
              {/* Card */}
              <div className="relative h-full p-6 md:p-8 lg:p-10 rounded-2xl md:rounded-3xl bg-gradient-to-b from-glass to-vault-dark border border-border/30 hover:border-brand/40 transition-all duration-500 overflow-hidden hover-lift hover-glow">
                {/* Number watermark */}
                <div className="absolute -right-4 -top-8 font-display text-[120px] md:text-[150px] font-black text-brand/[0.03] leading-none pointer-events-none select-none">
                  {feature.number}
                </div>
                
                {/* Icon */}
                <div className="relative z-10 w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-brand/10 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-brand/20 group-hover:scale-110 transition-all duration-500">
                  <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-brand" />
                </div>

                {/* Content */}
                <h3 className="relative z-10 font-display text-xl md:text-2xl font-semibold text-foreground mb-3 md:mb-4">
                  {feature.title}
                </h3>
                <p className="relative z-10 font-body text-muted-foreground leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>

                {/* Hover line accent */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-brand to-brand-light w-0 group-hover:w-full transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;