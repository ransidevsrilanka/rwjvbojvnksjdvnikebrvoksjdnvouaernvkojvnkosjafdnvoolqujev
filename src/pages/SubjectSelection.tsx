import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubjectSelection } from '@/hooks/useSubjectSelection';
import { BASKET_LABELS, OL_COMPULSORY_SUBJECTS } from '@/lib/subjectValidation';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  ArrowRight,
  User,
} from 'lucide-react';
import { STREAM_LABELS, GRADE_LABELS } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

const SubjectSelection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, enrollment, hasSelectedSubjects, refreshUserSubjects } = useAuth();
  const {
    subjectsByBasket,
    selectedSubjects,
    mandatorySubjects,
    validation,
    isLoading,
    isSaving,
    isLocked,
    isOL,
    firstLanguage,
    setFirstLanguage,
    religion,
    setReligion,
    olReligionOptions,
    olFirstLanguageOptions,
    toggleSubject,
    saveSelection,
  } = useSubjectSelection();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Redirect if already has locked subjects
  useEffect(() => {
    if (hasSelectedSubjects) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasSelectedSubjects, navigate]);

  if (!enrollment) {
    return null;
  }

  const handleConfirmSelection = async () => {
    const result = await saveSelection();
    setShowConfirmDialog(false);

    if (result.success) {
      // Show name dialog after subjects are confirmed
      setShowNameDialog(true);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save selection.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveName = async () => {
    if (!userName.trim() || !user) return;

    setIsSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: userName.trim() })
      .eq('user_id', user.id);

    setIsSavingName(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your name. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'All Set!',
      description: 'Your subjects and profile are now confirmed.',
    });
    
    await refreshUserSubjects();
    navigate('/dashboard', { replace: true });
  };

  // If already locked (from hook), redirect
  if (isLocked) {
    return null; // Will redirect via useEffect
  }

  // Different basket order for O/L vs A/L
  const basketOrder = isOL 
    ? ['basket1', 'basket2', 'basket3']
    : ['mandatory', 'core', 'optional', 'restricted', 'religion', 'language', 'aesthetic'];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <header className="py-8 border-b border-border mb-8">
            <span className="text-brand text-sm font-medium uppercase tracking-wider">
              Step 2 of 2
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 tracking-tight">
              {isOL ? 'Select Your O/L Subjects' : 'Select Your A/L Subjects'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {GRADE_LABELS[enrollment.grade as keyof typeof GRADE_LABELS] || enrollment.grade}
              {!isOL && enrollment.stream && ` • ${STREAM_LABELS[enrollment.stream as keyof typeof STREAM_LABELS]} Stream`}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {isOL ? (
                <>Choose <strong>1 subject from each category</strong> (3 optional subjects total). Your compulsory subjects are pre-set.</>
              ) : (
                <>Choose exactly <strong>3 subjects</strong> for your A/L studies. This selection will be locked after confirmation.</>
              )}
            </p>
          </header>

          {isLoading ? (
            <div className="glass-card p-16 text-center">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading subjects...</p>
            </div>
          ) : (
            <>
              {/* O/L Compulsory Subjects Display */}
              {isOL && (
                <div className="glass-card p-6 mb-8">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-brand" />
                    Compulsory Subjects (Fixed)
                  </h2>
                  
                  {/* First Language Selection */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">First Language</Label>
                    <RadioGroup value={firstLanguage} onValueChange={setFirstLanguage} className="flex gap-4">
                      {olFirstLanguageOptions.map((subj) => (
                        <div key={subj.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={subj.subject_name} id={subj.id} />
                          <Label htmlFor={subj.id} className="cursor-pointer">
                            {subj.subject_name.replace('First Language (', '').replace(')', '')}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Religion Selection */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Religion</Label>
                    <RadioGroup value={religion} onValueChange={setReligion} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {olReligionOptions.map((subj) => (
                        <div key={subj.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={subj.subject_name} id={subj.id} />
                          <Label htmlFor={subj.id} className="cursor-pointer">{subj.subject_name}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Fixed Compulsory Subjects */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Fixed Subjects</Label>
                    <div className="flex flex-wrap gap-2">
                      {OL_COMPULSORY_SUBJECTS.map((subject) => (
                        <span
                          key={subject}
                          className="inline-flex items-center gap-1.5 bg-secondary/80 text-muted-foreground px-3 py-1.5 rounded-lg text-sm border border-border"
                        >
                          <Lock className="w-3 h-3" />
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Status */}
              <div className="mb-6">
                {validation.errors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Invalid Selection</p>
                        <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                          {validation.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {validation.warnings.length > 0 && validation.errors.length === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-600">Warnings</p>
                        <ul className="text-sm text-yellow-600/80 mt-1 space-y-1">
                          {validation.warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {validation.valid && validation.warnings.length === 0 && selectedSubjects.length === 3 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <p className="font-medium text-green-600">Valid combination selected!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subject Selection */}
              <div className="space-y-8">
                {isOL && (
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Optional Subjects (Choose 1 from each category)
                  </h2>
                )}
                
                {basketOrder.map((basketKey) => {
                  const subjects = subjectsByBasket[basketKey];
                  if (!subjects || subjects.length === 0) return null;

                  // For O/L, skip mandatory/religion baskets as they're handled above
                  if (isOL && (basketKey === 'mandatory' || basketKey === 'religion')) {
                    return null;
                  }

                  return (
                    <div key={basketKey} className="glass-card p-6">
                      <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                        {BASKET_LABELS[basketKey] || basketKey}
                        {isOL && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            (Select 1)
                          </span>
                        )}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subjects.map((subject) => {
                          const isSelected = selectedSubjects.includes(subject.subject_name);
                          const isMandatory = mandatorySubjects.includes(subject.subject_name);
                          
                          // For O/L: check if another subject from same basket is selected
                          const sameBucketSelected = isOL && selectedSubjects.some(selected => {
                            const selSubj = subjects.find(s => s.subject_name === selected);
                            return selSubj && selSubj.subject_name !== subject.subject_name;
                          });
                          
                          // Disable if at max AND this subject is not already selected (A/L)
                          // Or if same bucket already has a selection (O/L) - but allow clicking to replace
                          const isDisabled = !isOL && selectedSubjects.length >= 3 && !isSelected;

                          return (
                            <label
                              key={subject.id}
                              className={`
                                flex items-center gap-3 p-4 rounded-lg border transition-all
                                ${isSelected 
                                  ? 'bg-brand/10 border-brand/40' 
                                  : sameBucketSelected
                                    ? 'bg-secondary/30 border-border/50 hover:border-muted-foreground/30'
                                    : 'bg-secondary/50 border-border hover:border-muted-foreground/30'}
                                ${isMandatory ? 'cursor-default' : isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                              onClick={(e) => {
                                e.preventDefault();
                                if (isMandatory) return;
                                if (isDisabled) return;
                                toggleSubject(subject.subject_name);
                              }}
                            >
                              {isOL ? (
                                <RadioGroupItem
                                  value={subject.subject_name}
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                              ) : (
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isMandatory}
                                  className="pointer-events-none"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {subject.subject_name}
                                  </span>
                                  {isMandatory && (
                                    <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      Required
                                    </span>
                                  )}
                                  {subject.basket === 'restricted' && (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">
                                      Restricted
                                    </span>
                                  )}
                                </div>
                                {subject.subject_code && (
                                  <span className="text-xs text-muted-foreground">{subject.subject_code}</span>
                                )}
                              </div>
                              {isSelected && !isMandatory && (
                                <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection Summary & Confirm */}
              <div className="mt-8 glass-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      {isOL ? 'Selected Optional Subjects' : 'Selected Subjects'} ({selectedSubjects.length}/3)
                    </h3>
                    {selectedSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedSubjects.map((subject) => (
                          <span
                            key={subject}
                            className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No subjects selected yet</p>
                    )}
                  </div>

                  <Button
                    size="lg"
                    disabled={!validation.valid || selectedSubjects.length !== 3 || isSaving}
                    onClick={() => setShowConfirmDialog(true)}
                    className="shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Confirm & Lock Selection
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Subjects</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {isOL && (
                <>
                  <p className="font-medium text-foreground">Compulsory Subjects:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>{firstLanguage}</li>
                    <li>{religion}</li>
                    {OL_COMPULSORY_SUBJECTS.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </>
              )}
              <p className="font-medium text-foreground mt-4">
                {isOL ? 'Optional Subjects:' : 'You are about to lock the following subjects:'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {selectedSubjects.map((s) => (
                  <li key={s} className="font-medium text-foreground">{s}</li>
                ))}
              </ul>
              <p className="text-destructive font-medium">
                ⚠️ This selection cannot be changed after confirmation. Contact support if you need to modify it later.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection}>
              Confirm Selection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand" />
              What do we call you?
            </DialogTitle>
            <DialogDescription>
              Enter your name so we can personalize your experience.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-secondary border-border"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              onClick={handleSaveName}
              disabled={!userName.trim() || isSavingName}
            >
              {isSavingName ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SubjectSelection;
