import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';

interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
  image_url: string | null;
  sort_order: number;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
}

const FlashcardsPage = () => {
  const { setId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!setId) {
      navigate('/dashboard');
      return;
    }

    const fetchFlashcards = async () => {
      const { data: setData, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (setError || !setData) {
        toast.error('Flashcard set not found');
        navigate('/dashboard');
        return;
      }

      setSet(setData);

      const { data: cardsData } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId)
        .order('sort_order');

      if (cardsData) {
        setCards(cardsData);
      }

      setIsLoading(false);
    };

    fetchFlashcards();
  }, [setId, navigate]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = () => {
    const currentCard = cards[currentIndex];
    setKnownCards(prev => new Set([...prev, currentCard.id]));
    handleNext();
  };

  const handleNotKnown = () => {
    handleNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setIsComplete(false);
  };

  const handleStudyUnknown = () => {
    const unknownCards = cards.filter(c => !knownCards.has(c.id));
    if (unknownCards.length > 0) {
      setCards(unknownCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsComplete(false);
    }
  };

  if (isLoading || !set) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4">
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Loading flashcards...</p>
          </div>
        </div>
      </main>
    );
  }

  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
  const currentCard = cards[currentIndex];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              <span>{knownCards.size}/{cards.length} mastered</span>
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {set.title}
            </h1>
            {set.description && (
              <p className="text-muted-foreground">{set.description}</p>
            )}
          </div>

          {cards.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No flashcards in this set yet.</p>
            </div>
          ) : isComplete ? (
            /* Completion screen */
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-brand/20 mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-brand" />
              </div>

              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Session Complete!
              </h2>
              <p className="text-muted-foreground mb-6">
                You've reviewed all {cards.length} cards. 
                You marked {knownCards.size} as known.
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
                {knownCards.size < cards.length && (
                  <Button variant="brand" onClick={handleStudyUnknown}>
                    Study Unknown ({cards.length - knownCards.size})
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Flashcard */}
              <div 
                onClick={handleFlip}
                className="relative h-80 cursor-pointer perspective-1000 mb-6"
              >
                <div className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}>
                  {/* Front */}
                  <div className={`absolute inset-0 glass-card p-8 flex items-center justify-center backface-hidden ${
                    isFlipped ? 'invisible' : ''
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                        Question
                      </p>
                      <p className="text-xl font-medium text-foreground">
                        {currentCard?.front_text}
                      </p>
                      <p className="text-sm text-muted-foreground mt-6">
                        Click to reveal answer
                      </p>
                    </div>
                  </div>

                  {/* Back */}
                  <div className={`absolute inset-0 glass-card p-8 flex items-center justify-center backface-hidden rotate-y-180 ${
                    !isFlipped ? 'invisible' : ''
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                        Answer
                      </p>
                      <p className="text-xl font-medium text-foreground">
                        {currentCard?.back_text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              {isFlipped ? (
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNotKnown}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Still Learning
                  </Button>
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={handleKnown}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Got It!
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                  >
                    Skip
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </main>
  );
};

export default FlashcardsPage;
