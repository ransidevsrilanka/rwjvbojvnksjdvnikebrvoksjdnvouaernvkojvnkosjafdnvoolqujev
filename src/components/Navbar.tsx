import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Key } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { branding, isLoading } = useBranding();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
    { name: "About", path: "/about" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-vault-dark/90 backdrop-blur-xl border-b border-border/50' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 z-10">
            {!isLoading && (
              branding.logoImage ? (
                <img src={branding.logoImage} alt={branding.siteName} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover" />
              ) : branding.logoText ? (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center">
                  <span className="font-display text-base md:text-lg font-bold text-brand">{branding.logoText}</span>
                </div>
              ) : null
            )}
            <span className="font-display text-lg md:text-xl font-bold text-foreground tracking-tight hidden sm:block">
              {branding.siteName}
            </span>
          </Link>

          {/* Centered Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-glass/50 border border-border/30 backdrop-blur-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? "bg-brand/10 text-brand"
                      : "text-muted-foreground hover:text-foreground hover:bg-glass"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3 z-10">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-medium">
                Sign In
              </Button>
            </Link>
            <Link to="/access">
              <Button variant="brand" size="sm" className="gap-2 font-semibold">
                <Key className="w-4 h-4" />
                Enter Code
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground rounded-lg hover:bg-glass transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="py-4 space-y-2 border-t border-border/50 bg-vault-dark">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.path)
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:text-foreground hover:bg-glass"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 space-y-2">
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/access" onClick={() => setIsOpen(false)}>
                <Button variant="brand" size="sm" className="w-full gap-2">
                  <Key className="w-4 h-4" />
                  Enter Code
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;