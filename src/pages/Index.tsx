import Navbar from "@/components/Navbar";
import ParallaxHero from "@/components/ParallaxHero";
import FeaturesGrid from "@/components/FeaturesGrid";
import StickyServices from "@/components/StickyServices";
import WhyChooseUs from "@/components/WhyChooseUs";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <ParallaxHero />
      <FeaturesGrid />
      <StickyServices />
      <WhyChooseUs />
      <PricingSection />
      <Footer />
    </main>
  );
};

export default Index;
