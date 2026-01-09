import { useEffect, useRef } from "react";
import { FileText, Download, Zap } from "lucide-react";

const services = [
  {
    id: 1,
    icon: FileText,
    title: "Curated Study Notes",
    subtitle: "Comprehensive Coverage",
    description: "Expertly crafted notes covering every topic in your curriculum. From fundamentals to advanced concepts, organized chapter by chapter for seamless learning.",
    features: ["Topic-wise breakdown", "Key points highlighted", "Exam-focused content", "Regular updates"]
  },
  {
    id: 2,
    icon: Download,
    title: "Offline Access",
    subtitle: "Learn Anywhere",
    description: "Download materials for offline study. Perfect for students in areas with limited connectivity. Your education shouldn't depend on internet availability.",
    features: ["PDF downloads", "Watermarked security", "Tier-based access", "Unlimited re-downloads"]
  },
  {
    id: 3,
    icon: Zap,
    title: "Instant Updates",
    subtitle: "Always Current",
    description: "Stay ahead with the latest syllabus changes and exam patterns. Our content is continuously updated to reflect the newest educational requirements.",
    features: ["Syllabus aligned", "New papers added", "Revision materials", "Early access for Premium"]
  }
];

const StickyServices = () => {
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
      { threshold: 0.3 }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative bg-background">
      {services.map((service, index) => (
        <div 
          key={service.id}
          className="sticky top-0 min-h-screen flex items-center py-16 md:py-20"
          style={{ 
            zIndex: index + 1,
          }}
        >
          <div 
            className="absolute inset-0 bg-vault-dark"
            style={{
              opacity: 0.98 - (index * 0.02)
            }}
          />
          
          {/* Accent glow */}
          <div 
            className={`absolute top-1/2 ${index % 2 === 0 ? 'right-0' : 'left-0'} w-[300px] md:w-[500px] h-[300px] md:h-[500px] -translate-y-1/2 rounded-full blur-[150px] md:blur-[200px] pointer-events-none bg-brand/8`}
          />

          <div 
            ref={(el) => (cardsRef.current[index] = el)}
            className="container mx-auto px-4 sm:px-6 relative z-10 reveal"
            style={{ transitionDelay: `${index * 0.1}s` }}
          >
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Content */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <span className="font-accent text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 block">
                  Service 0{service.id}
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
                  {service.title}
                </h2>
                <p className="text-lg md:text-xl font-medium mb-6 text-brand">
                  {service.subtitle}
                </p>
                <p className="font-body text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  {service.description}
                </p>

                {/* Features list */}
                <ul className="grid grid-cols-2 gap-3">
                  {service.features.map((feature, fIndex) => (
                    <li 
                      key={feature} 
                      className="flex items-center gap-2 animate-slide-up"
                      style={{ animationDelay: `${0.3 + fIndex * 0.1}s` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      <span className="font-body text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="relative">
                  {/* Main card */}
                  <div className="relative p-8 md:p-12 rounded-2xl md:rounded-3xl bg-gradient-to-b from-glass to-vault-dark border border-border/30 backdrop-blur-sm overflow-hidden hover-lift hover-glow">
                    {/* Icon */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-8">
                      <service.icon className="w-10 h-10 md:w-12 md:h-12 text-brand" />
                    </div>

                    {/* Decorative number */}
                    <div className="absolute -right-4 -bottom-8 font-display text-[150px] md:text-[200px] font-black text-foreground/[0.02] leading-none pointer-events-none select-none">
                      0{service.id}
                    </div>

                    {/* Grid pattern */}
                    <div 
                      className="absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                        backgroundSize: '24px 24px'
                      }}
                    />
                  </div>

                  {/* Floating accent */}
                  <div className="absolute -top-4 -right-4 w-24 md:w-32 h-24 md:h-32 rounded-full blur-[40px] md:blur-[60px] bg-brand/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Section separator */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        </div>
      ))}
    </section>
  );
};

export default StickyServices;