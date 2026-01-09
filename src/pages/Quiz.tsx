import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  question_ids: string[];
  time_limit_minutes: number | null;
  pass_percentage: number;
}

const QuizPage = () => {
  const { quizId } = useParams();
  const { user, enrollment } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!quizId) {
      navigate('/dashboard');
      return;
    }

    const fetchQuiz = async () => {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError || !quizData) {
        toast.error('Quiz not found');
        navigate('/dashboard');
        return;
      }

      setQuiz(quizData);

      if (quizData.time_limit_minutes) {
        setTimeLeft(quizData.time_limit_minutes * 60);
      }

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('question_bank')
        .select('*')
        .in('id', quizData.question_ids);

      if (questionsData) {
        // Maintain order from question_ids
        const orderedQuestions = quizData.question_ids
          .map((id: string) => questionsData.find(q => q.id === id))
          .filter(Boolean) as Question[];
        setQuestions(orderedQuestions);
      }

      setIsLoading(false);
    };

    fetchQuiz();
  }, [quizId, navigate]);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const handleAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;

    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    setScore(scorePercent);
    setIsSubmitted(true);

    const passed = scorePercent >= (quiz?.pass_percentage || 60);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    // Save attempt
    if (user && quiz) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quiz.id,
        answers,
        score: scorePercent,
        total_questions: questions.length,
        passed,
        time_taken_seconds: timeTaken,
        completed_at: new Date().toISOString(),
      });
    }

    if (passed) {
      toast.success(`🎉 Congratulations! You passed with ${scorePercent}%!`);
    } else {
      toast.error(`You scored ${scorePercent}%. You need ${quiz?.pass_percentage}% to pass.`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || !quiz) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4">
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit Quiz
            </Link>

            {timeLeft !== null && !isSubmitted && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                timeLeft < 60 ? 'bg-destructive/20 text-destructive' : 'bg-secondary'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="glass-card p-6 mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-muted-foreground">{quiz.description}</p>
            )}
          </div>

          {!isSubmitted ? (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Question */}
              {currentQuestion && (
                <div className="glass-card p-6 mb-6">
                  <h2 className="text-lg font-medium text-foreground mb-6">
                    {currentQuestion.question_text}
                  </h2>

                  {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswer(currentQuestion.id, option)}
                          className={`w-full p-4 rounded-lg border text-left transition-all ${
                            answers[currentQuestion.id] === option
                              ? 'border-brand bg-brand/10 text-foreground'
                              : 'border-border bg-secondary/50 hover:border-muted-foreground/50'
                          }`}
                        >
                          <span className="font-medium mr-3">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.question_type === 'true_false' && (
                    <div className="flex gap-4">
                      {['True', 'False'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleAnswer(currentQuestion.id, option)}
                          className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                            answers[currentQuestion.id] === option
                              ? 'border-brand bg-brand/10 text-foreground'
                              : 'border-border bg-secondary/50 hover:border-muted-foreground/50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </Button>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    variant="brand"
                    onClick={() => setCurrentIndex(i => i + 1)}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    variant="brand"
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < questions.length}
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Results */
            <div className="glass-card p-8 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                score >= (quiz.pass_percentage || 60) 
                  ? 'bg-green-500/20' 
                  : 'bg-destructive/20'
              }`}>
                {score >= (quiz.pass_percentage || 60) ? (
                  <Trophy className="w-10 h-10 text-green-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-destructive" />
                )}
              </div>

              <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                {score}%
              </h2>
              <p className="text-muted-foreground mb-6">
                {score >= (quiz.pass_percentage || 60) 
                  ? 'Congratulations! You passed the quiz!' 
                  : `You need ${quiz.pass_percentage}% to pass. Try again!`
                }
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Button variant="brand" onClick={() => window.location.reload()}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Quiz
                </Button>
              </div>

              {/* Review answers */}
              <div className="mt-8 text-left">
                <h3 className="font-semibold text-foreground mb-4">Review Answers</h3>
                <div className="space-y-4">
                  {questions.map((q, index) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                    
                    return (
                      <div key={q.id} className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">
                              {index + 1}. {q.question_text}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Your answer: <span className={isCorrect ? 'text-green-500' : 'text-destructive'}>{userAnswer || 'Not answered'}</span>
                            </p>
                            {!isCorrect && (
                              <p className="text-sm text-green-500">
                                Correct answer: {q.correct_answer}
                              </p>
                            )}
                            {q.explanation && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default QuizPage;
