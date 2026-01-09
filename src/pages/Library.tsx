import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  BookOpen, 
  GraduationCap, 
  Briefcase, 
  Cpu, 
  TrendingUp, 
  Brain, 
  Award,
  Clock,
  Star
} from "lucide-react";

const categories = [
  { icon: GraduationCap, name: "Education", count: 245 },
  { icon: Award, name: "Exam Prep", count: 128 },
  { icon: Cpu, name: "Technology", count: 189 },
  { icon: Briefcase, name: "Business", count: 156 },
  { icon: Brain, name: "Self-Growth", count: 203 },
  { icon: TrendingUp, name: "Finance", count: 97 },
];

const recentBooks = [
  { title: "Advanced Mathematics for Engineering", category: "Education", rating: 4.8 },
  { title: "Complete Guide to Python Programming", category: "Technology", rating: 4.9 },
  { title: "Business Strategy Fundamentals", category: "Business", rating: 4.7 },
  { title: "Mindset: The New Psychology of Success", category: "Self-Growth", rating: 4.9 },
  { title: "A/L Chemistry Complete Guide", category: "Exam Prep", rating: 4.8 },
  { title: "Personal Finance Mastery", category: "Finance", rating: 4.6 },
];

const Library = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-24 pb-12 bg-vault-surface">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                Your Library
              </h1>
              <p className="text-muted-foreground text-sm">
                Browse and read from our curated collection
              </p>
            </div>
            
            {/* Search */}
            <div className="relative max-w-sm w-full">
              <Input
                type="text"
                placeholder="Search books, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-10 pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.name ? null : category.name
                )}
                className={`glass-card p-3 text-center transition-all group ${
                  selectedCategory === category.name 
                    ? "border-brand bg-brand/10" 
                    : "hover:border-brand/40"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors ${
                  selectedCategory === category.name
                    ? "bg-brand/20"
                    : "bg-brand/10 group-hover:bg-brand/20"
                }`}>
                  <category.icon className="w-4 h-4 text-brand" />
                </div>
                <h3 className="font-medium text-foreground text-sm">{category.name}</h3>
                <p className="text-muted-foreground text-xs">{category.count} books</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4">
          {/* Recently Added */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-4 h-4 text-brand" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Recently Added
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBooks.map((book, index) => (
                <div 
                  key={index}
                  className="glass-card p-4 hover:border-brand/40 transition-all cursor-pointer group"
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-18 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm mb-1 truncate group-hover:text-brand transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-muted-foreground text-xs mb-1">{book.category}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-brand fill-brand" />
                        <span className="text-xs text-foreground">{book.rating}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="brand-outline" size="sm" className="w-full mt-3">
                    Read Now
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Browse All */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-3">
              Showing sample content. Full library access requires verification.
            </p>
            <Button variant="brand">
              Browse All Books
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Library;
