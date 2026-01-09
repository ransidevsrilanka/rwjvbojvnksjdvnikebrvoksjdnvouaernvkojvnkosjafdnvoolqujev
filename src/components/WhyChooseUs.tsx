import { useState, useEffect, useRef } from "react";
import { Lock, Users, Trophy, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const reasons = [
  {
    icon: Lock,
    title: "No Content Chaos",
    stat: "100%",
    statLabel: "Organized",
    description: "Every piece of content is structured, categorized, and easy to find. No random files, no confusion — just clear, logical learning paths."
  },
  {
    icon: Users,
    title: "Anti-Piracy Protection",
    stat: "1:1",
    statLabel: "Binding",
    description: "Access codes bound to single users. Watermarked downloads. Your investment stays protected, ensuring fair access for all students."
  },
  {
    icon: Trophy,
    title: "Exam Success Focus",
    stat: "O/L & A/L",
    statLabel: "Aligned",
    description: "Content designed specifically for Sri Lankan national examinations. Nothing irrelevant, everything essential for your success."
  },
  {
    icon: Clock,
    title: "Time Efficient",
    stat: "24/7",
    statLabel: "Access",
    description: "Study on your schedule. Materials available whenever you need them, whether you're an early bird or a night owl."
  }
];

const WhyChooseUs = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { branding } = useBranding();

  const goToSlide = (index: number) => {
    if (isAnimating || index === activeIndex) return;
    setIsAnimating(true);
    setActiveIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goNext = () => {
    const next = (activeIndex + 1) % reasons.length;
    goToSlide(next);
  };

  const goPrev = () => {
    const prev = activeIndex === 0 ? reasons.length - 1 : activeIndex - 1;
    goToSlide(prev);
  };

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        goNext();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIndex, isAnimating]);

  const ActiveIcon = reasons[activeIndex].icon;

  return (
    <section ref={sectionRef} className="relative bg-background py-24 md:py-32 lg:py-40 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-vault-surface via-background to-vault-dark" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      
      {/* Floating accent */}
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="font-accent text-brand text-sm uppercase tracking-[0.2em] mb-4 block">Why {branding.siteName}</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
            Built for <span className="text-brand-gradient">Serious</span> Students
          </h2>
          <p className="font-body text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            We don't just provide study materials. We provide a disciplined, organized, 
            and secure academic environment.
          </p>
        </div>

        {/* Main Showcase */}
        <div className="max-w-5xl mx-auto">
          {/* Featured Card - Large Display */}
          <div className="relative mb-8 md:mb-12">
            <div className="relative p-8 md:p-12 lg:p-16 rounded-3xl bg-gradient-to-br from-glass via-vault-dark to-glass border border-border/30 overflow-hidden min-h-[400px] md:min-h-[450px]">
              {/* Animated background glow */}
              <div 
                className="absolute inset-0 bg-brand/5 transition-opacity duration-500"
                style={{ opacity: isAnimating ? 0.8 : 0.3 }}
              />
              
              {/* Content with fade transition */}
              <div 
                className={`relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-16 transition-all duration-500 ${
                  isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                {/* Icon side */}
                <div className="flex-shrink-0">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl md:rounded-3xl bg-brand/10 flex items-center justify-center border border-brand/20">
                    <ActiveIcon className="w-14 h-14 md:w-18 md:h-18 text-brand" />
                  </div>
                </div>
                
                {/* Text side */}
                <div className="text-center lg:text-left flex-1">
                  <div className="mb-4 md:mb-6">
                    <span className="font-display text-5xl md:text-6xl lg:text-7xl font-black text-brand-gradient">
                      {reasons[activeIndex].stat}
                    </span>
                    <span className="font-accent text-sm text-muted-foreground uppercase tracking-wider block mt-2">
                      {reasons[activeIndex].statLabel}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                    {reasons[activeIndex].title}
                  </h3>
                  <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
                    {reasons[activeIndex].description}
                  </p>
                </div>
              </div>

              {/* Navigation arrows - Desktop */}
              <button 
                onClick={goPrev}
                className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-glass/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/50 transition-all hidden md:flex"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={goNext}
                className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-glass/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/50 transition-all hidden md:flex"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Decorative number watermark */}
              <div className="absolute -right-8 -bottom-12 font-display text-[180px] md:text-[250px] font-black text-foreground/[0.02] leading-none pointer-events-none select-none">
                0{activeIndex + 1}
              </div>
            </div>
          </div>

          {/* Thumbnail Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <button
                  key={reason.title}
                  onClick={() => goToSlide(index)}
                  className={`relative p-4 md:p-5 rounded-xl md:rounded-2xl border text-left transition-all duration-300 group ${
                    index === activeIndex 
                      ? 'bg-brand/10 border-brand/40 scale-[1.02]' 
                      : 'bg-glass/30 border-border/20 hover:border-brand/30 hover:bg-glass/50'
                  }`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mb-3 transition-all ${
                    index === activeIndex ? 'bg-brand/20' : 'bg-secondary group-hover:bg-brand/10'
                  }`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${
                      index === activeIndex ? 'text-brand' : 'text-muted-foreground group-hover:text-brand'
                    }`} />
                  </div>
                  
                  <h4 className={`font-display text-sm md:text-base font-semibold mb-1 transition-colors ${
                    index === activeIndex ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  }`}>
                    {reason.title}
                  </h4>
                  
                  <span className={`font-accent text-xs md:text-sm font-medium ${
                    index === activeIndex ? 'text-brand' : 'text-muted-foreground'
                  }`}>
                    {reason.stat}
                  </span>

                  {/* Active indicator line */}
                  <div className={`absolute bottom-0 left-0 h-1 bg-brand rounded-b-xl transition-all duration-300 ${
                    index === activeIndex ? 'w-full' : 'w-0'
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Mobile swipe hint */}
          <div className="flex items-center justify-center gap-4 mt-6 md:hidden">
            <button 
              onClick={goPrev}
              className="w-10 h-10 rounded-full bg-glass/80 border border-border/50 flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {reasons.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex ? 'bg-brand w-6' : 'bg-border w-2'
                  }`}
                />
              ))}
            </div>
            <button 
              onClick={goNext}
              className="w-10 h-10 rounded-full bg-glass/80 border border-border/50 flex items-center justify-center text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;