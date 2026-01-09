import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/storageClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  FileText,
  Upload,
  FolderOpen,
  X,
  Search,
  HelpCircle,
  Brain,
  Layers,
  Edit,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, Topic, Note, GradeLevel, StreamType, MediumType, TierType, GradeGroup } from '@/types/database';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS, GRADE_GROUPS } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank';
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  topic_id: string | null;
  min_tier: TierType;
  is_active: boolean;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topic_id: string | null;
  question_ids: string[];
  time_limit_minutes: number | null;
  pass_percentage: number | null;
  min_tier: TierType;
  is_active: boolean;
  created_at: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  topic_id: string | null;
  card_count: number;
  min_tier: TierType;
  is_active: boolean;
  created_at: string;
}

interface Flashcard {
  id: string;
  set_id: string;
  front_text: string;
  back_text: string;
  image_url: string | null;
  sort_order: number;
}

const ContentManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'content';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // View state
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Subject form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('al_grade12');
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<GradeGroup>('al');
  const [selectedStreams, setSelectedStreams] = useState<StreamType[]>(['maths']);
  const [medium, setMedium] = useState<MediumType>('english');

  // Topic form
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');

  // Note form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteMinTier, setNoteMinTier] = useState<TierType>('starter');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [noteUploadRequested, setNoteUploadRequested] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  // Question Bank state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [questionSubjectId, setQuestionSubjectId] = useState('');
  const [questionSubjectSearch, setQuestionSubjectSearch] = useState('');
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'true_false' | 'fill_blank',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    topic_id: '',
    min_tier: 'starter' as TierType,
  });

  // Quiz state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizSubjectId, setQuizSubjectId] = useState('');
  const [quizSubjectSearch, setQuizSubjectSearch] = useState('');
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    topic_id: '',
    question_ids: [] as string[],
    time_limit_minutes: 30,
    pass_percentage: 60,
    min_tier: 'starter' as TierType,
  });
  const [topicQuestions, setTopicQuestions] = useState<Question[]>([]);

  // Flashcard state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [selectedFlashcardSet, setSelectedFlashcardSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSubjectId, setFlashcardSubjectId] = useState('');
  const [flashcardSubjectSearch, setFlashcardSubjectSearch] = useState('');
  const [flashcardSetForm, setFlashcardSetForm] = useState({
    title: '',
    description: '',
    topic_id: '',
    min_tier: 'starter' as TierType,
  });
  const [flashcardForm, setFlashcardForm] = useState({
    front_text: '',
    back_text: '',
  });

  // Filtered topics based on subject selection
  const getFilteredTopics = useCallback((subjectId: string) => {
    if (!subjectId) return [];
    return allTopics.filter((t: any) => t.subject_id === subjectId);
  }, [allTopics]);

  const questionFilteredTopics = getFilteredTopics(questionSubjectId);
  const quizFilteredTopics = getFilteredTopics(quizSubjectId);
  const flashcardFilteredTopics = getFilteredTopics(flashcardSubjectId);

  // Filter subjects by search
  const filterSubjects = useCallback((search: string) => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(s => 
      s.name.toLowerCase().includes(q) ||
      GRADE_LABELS[s.grade]?.toLowerCase().includes(q) ||
      STREAM_LABELS[s.stream]?.toLowerCase().includes(q)
    );
  }, [subjects]);

  // Fetch functions
  const fetchSubjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('grade', { ascending: true })
      .order('stream', { ascending: true })
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setSubjects(data as Subject[]);
    }
    setIsLoading(false);
  };

  const fetchAllTopics = async () => {
    const { data, error } = await supabase
      .from('topics')
      .select('*, subjects(name)')
      .order('name', { ascending: true });

    if (!error && data) {
      setAllTopics(data as any);
    }
  };

  const fetchTopics = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTopics(data as Topic[]);
    }
  };

  const fetchNotes = async (topicId: string) => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data as Note[]);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuestions(data as Question[]);
    }
    setIsLoading(false);
  };

  const fetchQuizzes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuizzes(data as Quiz[]);
    }
    setIsLoading(false);
  };

  const fetchFlashcardSets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFlashcardSets(data as FlashcardSet[]);
    }
    setIsLoading(false);
  };

  const fetchFlashcards = async (setId: string) => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('set_id', setId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setFlashcards(data as Flashcard[]);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchAllTopics();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      fetchQuestions();
    } else if (activeTab === 'quizzes') {
      fetchQuizzes();
    } else if (activeTab === 'flashcards') {
      fetchFlashcardSets();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject.id);
      setSelectedTopic(null);
      setNotes([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTopic) {
      fetchNotes(selectedTopic.id);
    }
  }, [selectedTopic]);

  useEffect(() => {
    if (selectedFlashcardSet) {
      fetchFlashcards(selectedFlashcardSet.id);
    }
  }, [selectedFlashcardSet]);

  // Fetch questions when quiz topic changes
  useEffect(() => {
    const fetchTopicQuestions = async () => {
      if (!quizForm.topic_id) {
        setTopicQuestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('topic_id', quizForm.topic_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTopicQuestions(data as Question[]);
      }
    };
    fetchTopicQuestions();
  }, [quizForm.topic_id]);

  // Subject/Topic/Note handlers (existing)
  const handleAddSubject = async () => {
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    if (selectedStreams.length === 0) {
      toast.error('At least one stream is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from('subjects')
      .insert({
        name,
        description,
        grade,
        stream: selectedStreams[0],
        streams: selectedStreams,
        medium,
        is_active: true,
      });

    if (error) {
      toast.error('Failed to add subject');
    } else {
      toast.success('Subject added');
      setName('');
      setDescription('');
      setSelectedStreams(['maths']);
      fetchSubjects();
    }
    setIsAdding(false);
  };

  const handleAddTopic = async () => {
    if (!topicName.trim() || !selectedSubject) {
      toast.error('Topic name is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from('topics')
      .insert({
        subject_id: selectedSubject.id,
        name: topicName,
        description: topicDescription,
        is_active: true,
      });

    if (error) {
      toast.error('Failed to add topic');
    } else {
      toast.success('Topic added');
      setTopicName('');
      setTopicDescription('');
      fetchTopics(selectedSubject.id);
      fetchAllTopics();
    }
    setIsAdding(false);
  };

  const handleUploadNote = async () => {
    if (!noteTitle.trim() || !selectedTopic || !noteFile) {
      toast.error('Title and file are required');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = noteFile.name.split('.').pop();
      const fileName = `${selectedTopic.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(fileName, noteFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('notes')
        .insert({
          topic_id: selectedTopic.id,
          title: noteTitle,
          description: noteDescription,
          file_url: fileName,
          file_size: noteFile.size,
          min_tier: noteMinTier,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success('Note uploaded successfully');
      setNoteTitle('');
      setNoteDescription('');
      setNoteFile(null);
      setNoteMinTier('starter');
      fetchNotes(selectedTopic.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload note');
    }
    setIsUploading(false);
  };

  useEffect(() => {
    if (!noteUploadRequested) return;
    setNoteUploadRequested(false);
    void handleUploadNote();
  }, [noteUploadRequested]);

  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete subject');
    } else {
      toast.success('Subject deleted');
      if (selectedSubject?.id === id) setSelectedSubject(null);
      fetchSubjects();
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic and all its notes?')) return;

    const { error } = await supabase.from('topics').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete topic');
    } else {
      toast.success('Topic deleted');
      if (selectedTopic?.id === id) setSelectedTopic(null);
      if (selectedSubject) fetchTopics(selectedSubject.id);
      fetchAllTopics();
    }
  };

  const deleteNote = async (id: string, fileUrl: string | null) => {
    if (!confirm('Delete this note?')) return;

    if (fileUrl) {
      const path = fileUrl.split('/notes/')[1];
      if (path) {
        await supabase.storage.from('notes').remove([path]);
      }
    }

    const { error } = await supabase.from('notes').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete note');
    } else {
      toast.success('Note deleted');
      if (selectedTopic) fetchNotes(selectedTopic.id);
    }
  };

  const toggleSubjectActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('subjects').update({ is_active: !isActive }).eq('id', id);

    if (!error) {
      toast.success(isActive ? 'Subject deactivated' : 'Subject activated');
      fetchSubjects();
    }
  };

  // Question Bank handlers
  const handleAddQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (!questionForm.correct_answer.trim()) {
      toast.error('Correct answer is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase.from('question_bank').insert({
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      options: questionForm.question_type === 'mcq' ? questionForm.options.filter(o => o.trim()) : null,
      correct_answer: questionForm.correct_answer,
      explanation: questionForm.explanation || null,
      difficulty: questionForm.difficulty,
      topic_id: questionForm.topic_id || null,
      min_tier: questionForm.min_tier,
      is_active: true,
    });

    if (error) {
      toast.error('Failed to add question');
    } else {
      toast.success('Question added');
      setQuestionForm({
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: '',
        difficulty: 'medium',
        topic_id: '',
        min_tier: 'starter',
      });
      fetchQuestions();
    }
    setIsAdding(false);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;

    const { error } = await supabase.from('question_bank').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete question');
    } else {
      toast.success('Question deleted');
      fetchQuestions();
    }
  };

  // Quiz handlers
  const handleAddQuiz = async () => {
    if (!quizForm.title.trim()) {
      toast.error('Quiz title is required');
      return;
    }
    if (quizForm.question_ids.length === 0) {
      toast.error('Select at least one question');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase.from('quizzes').insert({
      title: quizForm.title,
      description: quizForm.description || null,
      topic_id: quizForm.topic_id || null,
      question_ids: quizForm.question_ids,
      time_limit_minutes: quizForm.time_limit_minutes,
      pass_percentage: quizForm.pass_percentage,
      min_tier: quizForm.min_tier,
      is_active: true,
    });

    if (error) {
      toast.error('Failed to create quiz');
    } else {
      toast.success('Quiz created');
      setQuizForm({
        title: '',
        description: '',
        topic_id: '',
        question_ids: [],
        time_limit_minutes: 30,
        pass_percentage: 60,
        min_tier: 'starter',
      });
      fetchQuizzes();
    }
    setIsAdding(false);
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;

    const { error } = await supabase.from('quizzes').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete quiz');
    } else {
      toast.success('Quiz deleted');
      fetchQuizzes();
    }
  };

  // Flashcard handlers
  const handleAddFlashcardSet = async () => {
    if (!flashcardSetForm.title.trim()) {
      toast.error('Set title is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase.from('flashcard_sets').insert({
      title: flashcardSetForm.title,
      description: flashcardSetForm.description || null,
      topic_id: flashcardSetForm.topic_id || null,
      min_tier: flashcardSetForm.min_tier,
      is_active: true,
    });

    if (error) {
      toast.error('Failed to create flashcard set');
    } else {
      toast.success('Flashcard set created');
      setFlashcardSetForm({
        title: '',
        description: '',
        topic_id: '',
        min_tier: 'starter',
      });
      fetchFlashcardSets();
    }
    setIsAdding(false);
  };

  const deleteFlashcardSet = async (id: string) => {
    if (!confirm('Delete this flashcard set and all its cards?')) return;

    const { error } = await supabase.from('flashcard_sets').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete flashcard set');
    } else {
      toast.success('Flashcard set deleted');
      if (selectedFlashcardSet?.id === id) setSelectedFlashcardSet(null);
      fetchFlashcardSets();
    }
  };

  const handleAddFlashcard = async () => {
    if (!flashcardForm.front_text.trim() || !flashcardForm.back_text.trim()) {
      toast.error('Front and back text are required');
      return;
    }
    if (!selectedFlashcardSet) return;

    setIsAdding(true);
    const { error } = await supabase.from('flashcards').insert({
      set_id: selectedFlashcardSet.id,
      front_text: flashcardForm.front_text,
      back_text: flashcardForm.back_text,
      sort_order: flashcards.length,
    });

    if (error) {
      toast.error('Failed to add flashcard');
    } else {
      toast.success('Flashcard added');
      setFlashcardForm({ front_text: '', back_text: '' });
      fetchFlashcards(selectedFlashcardSet.id);
      // Update card count
      await supabase.from('flashcard_sets').update({ card_count: flashcards.length + 1 }).eq('id', selectedFlashcardSet.id);
    }
    setIsAdding(false);
  };

  const deleteFlashcard = async (id: string) => {
    if (!confirm('Delete this flashcard?')) return;

    const { error } = await supabase.from('flashcards').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete flashcard');
    } else {
      toast.success('Flashcard deleted');
      if (selectedFlashcardSet) {
        fetchFlashcards(selectedFlashcardSet.id);
        await supabase.from('flashcard_sets').update({ card_count: flashcards.length - 1 }).eq('id', selectedFlashcardSet.id);
      }
    }
  };

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button 
        onClick={() => { setSelectedSubject(null); setSelectedTopic(null); }}
        className="text-brand hover:underline"
      >
        Subjects
      </button>
      {selectedSubject && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button 
            onClick={() => setSelectedTopic(null)}
            className="text-brand hover:underline"
          >
            {selectedSubject.name}
          </button>
        </>
      )}
      {selectedTopic && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{selectedTopic.name}</span>
        </>
      )}
    </div>
  );

  // Subject List View
  const renderSubjectList = () => (
    <>
      {/* Add Subject Form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Add New Subject
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Combined Mathematics"
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Level</label>
            <select
              value={selectedGradeGroup}
              onChange={(e) => {
                const group = e.target.value as GradeGroup;
                setSelectedGradeGroup(group);
                setGrade(GRADE_GROUPS[group].grades[0]);
              }}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(GRADE_GROUPS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as GradeLevel)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {GRADE_GROUPS[selectedGradeGroup].grades.map((gradeValue) => (
                <option key={gradeValue} value={gradeValue}>{GRADE_LABELS[gradeValue]}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-2 block">Streams (select all that apply) *</label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STREAM_LABELS).map(([value, label]) => {
                const streamValue = value as StreamType;
                const isSelected = selectedStreams.includes(streamValue);
                return (
                  <label
                    key={value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-brand/10 border-brand/40 text-foreground' 
                        : 'bg-secondary border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStreams([...selectedStreams, streamValue]);
                        } else {
                          setSelectedStreams(selectedStreams.filter(s => s !== streamValue));
                        }
                      }}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Medium</label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value as MediumType)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(MEDIUM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <Button variant="brand" size="sm" onClick={handleAddSubject} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Subject
        </Button>
      </div>

      {/* Subjects List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Subjects ({subjects.filter(s => {
              if (!subjectSearch) return true;
              const search = subjectSearch.toLowerCase();
              return (
                s.name.toLowerCase().includes(search) ||
                (GRADE_LABELS[s.grade]?.toLowerCase().includes(search) || false) ||
                (STREAM_LABELS[s.stream]?.toLowerCase().includes(search) || false)
              );
            }).length})
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="pl-10 w-48 bg-secondary border-border h-9"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={fetchSubjects}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No subjects added yet</div>
        ) : (
          <div>
            {Object.entries(GRADE_GROUPS).map(([groupKey, { label, grades }]) => {
              const allGroupSubjects = subjects.filter(s => grades.includes(s.grade as GradeLevel));
              const groupSubjects = allGroupSubjects.filter(s => {
                if (!subjectSearch) return true;
                const search = subjectSearch.toLowerCase();
                return (
                  s.name.toLowerCase().includes(search) ||
                  (GRADE_LABELS[s.grade]?.toLowerCase().includes(search) || false) ||
                  (STREAM_LABELS[s.stream]?.toLowerCase().includes(search) || false)
                );
              });
              if (groupSubjects.length === 0) return null;
              
              return (
                <div key={groupKey}>
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {groupSubjects.map((subject) => (
                      <div key={subject.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedSubject(subject)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-brand" />
                            </div>
                            <div>
                              <p className={`text-foreground font-medium text-sm ${subject.medium === 'sinhala' ? 'font-sinhala' : ''}`}>
                                {subject.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-muted-foreground text-xs">
                                  {GRADE_LABELS[subject.grade]} • {MEDIUM_LABELS[subject.medium]}
                                </span>
                                <span className="text-muted-foreground text-xs">•</span>
                                {(subject.streams || [subject.stream]).map((s) => (
                                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {STREAM_LABELS[s]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSubjectActive(subject.id, subject.is_active)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              subject.is_active ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                            }`}
                          >
                            {subject.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(subject)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSubject(subject.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // Topics View
  const renderTopicList = () => (
    <>
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Add Topic to {selectedSubject?.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic Name *</label>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g., Differentiation"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>
        </div>

        <Button variant="brand" size="sm" onClick={handleAddTopic} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Topic
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-brand" />
            Topics ({topics.length})
          </h2>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No topics yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {topics.map((topic) => (
              <div key={topic.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                <button onClick={() => setSelectedTopic(topic)} className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{topic.name}</p>
                      {topic.description && <p className="text-muted-foreground text-xs">{topic.description}</p>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTopic(topic)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTopic(topic.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Notes View
  const renderNotesList = () => (
    <>
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-brand" />
          Upload Note to "{selectedTopic?.name}"
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Note Title *</label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g., Chapter 1 Notes"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier</label>
            <select
              value={noteMinTier}
              onChange={(e) => setNoteMinTier(e.target.value as TierType)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(TIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">File (PDF) *</label>
            <div className="relative">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                className="bg-secondary border-border h-9"
              />
              {noteFile && (
                <button
                  onClick={() => setNoteFile(null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {noteFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {noteFile.name} ({(noteFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        <Button type="button" variant="brand" size="sm" onClick={() => setNoteUploadRequested(true)} disabled={isUploading || !noteFile}>
          {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Upload Note
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            Notes ({notes.length})
          </h2>
        </div>

        {notes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No notes yet. Upload one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-sm">{note.title}</p>
                    <p className="text-muted-foreground text-xs">
                      Min: {TIER_LABELS[note.min_tier]} • {note.file_size ? `${(note.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {note.file_url && (
                    <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline text-sm">
                      View
                    </a>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id, note.file_url)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Question Bank View
  const renderQuestionBank = () => (
    <>
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Add New Question
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Question Text *</label>
            <Textarea
              value={questionForm.question_text}
              onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
              placeholder="Enter your question..."
              className="bg-secondary border-border min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Question Type</label>
            <select
              value={questionForm.question_type}
              onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value as any })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={questionSubjectSearch}
                onChange={(e) => setQuestionSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                className="bg-secondary border-border h-9 pl-10"
              />
            </div>
            <select
              value={questionSubjectId}
              onChange={(e) => {
                setQuestionSubjectId(e.target.value);
                setQuestionForm({ ...questionForm, topic_id: '' });
              }}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm mt-2"
            >
              <option value="">Select subject first...</option>
              {filterSubjects(questionSubjectSearch).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} - {GRADE_LABELS[subject.grade]} {STREAM_LABELS[subject.stream]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic *</label>
            <select
              value={questionForm.topic_id}
              onChange={(e) => setQuestionForm({ ...questionForm, topic_id: e.target.value })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
              disabled={!questionSubjectId}
            >
              <option value="">{questionSubjectId ? 'Select topic...' : 'Select subject first'}</option>
              {questionFilteredTopics.map((topic: any) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
            {questionSubjectId && questionFilteredTopics.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No topics for this subject. Add topics first.</p>
            )}
          </div>

          {questionForm.question_type === 'mcq' && (
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Options</label>
              <div className="grid grid-cols-2 gap-2">
                {questionForm.options.map((opt, idx) => (
                  <Input
                    key={idx}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[idx] = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="bg-secondary border-border h-9"
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Correct Answer *</label>
            {questionForm.question_type === 'true_false' ? (
              <select
                value={questionForm.correct_answer}
                onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
              >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <Input
                value={questionForm.correct_answer}
                onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                placeholder="Enter correct answer"
                className="bg-secondary border-border h-9"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
            <select
              value={questionForm.difficulty}
              onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier</label>
            <select
              value={questionForm.min_tier}
              onChange={(e) => setQuestionForm({ ...questionForm, min_tier: e.target.value as TierType })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(TIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Explanation (optional)</label>
            <Textarea
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              placeholder="Explain the correct answer..."
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <Button variant="brand" size="sm" onClick={handleAddQuestion} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Question
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand" />
            Questions ({questions.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchQuestions}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No questions yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {questions.map((q) => (
              <div key={q.id} className="p-4 hover:bg-secondary/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-medium">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{q.question_type}</Badge>
                      <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                      <Badge variant="outline" className="text-xs">{TIER_LABELS[q.min_tier as TierType]}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-2">
                      Answer: <span className="text-brand">{q.correct_answer}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Quizzes View
  const renderQuizzes = () => (
    <>
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Create New Quiz
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Quiz Title *</label>
            <Input
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              placeholder="e.g., Chapter 1 Quiz"
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={quizSubjectSearch}
                onChange={(e) => setQuizSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                className="bg-secondary border-border h-9 pl-10"
              />
            </div>
            <select
              value={quizSubjectId}
              onChange={(e) => {
                setQuizSubjectId(e.target.value);
                setQuizForm({ ...quizForm, topic_id: '', question_ids: [] });
              }}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm mt-2"
            >
              <option value="">Select subject first...</option>
              {filterSubjects(quizSubjectSearch).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} - {GRADE_LABELS[subject.grade]} {STREAM_LABELS[subject.stream]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic *</label>
            <select
              value={quizForm.topic_id}
              onChange={(e) => setQuizForm({ ...quizForm, topic_id: e.target.value, question_ids: [] })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
              disabled={!quizSubjectId}
            >
              <option value="">{quizSubjectId ? 'Select topic...' : 'Select subject first'}</option>
              {quizFilteredTopics.map((topic: any) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
            {quizSubjectId && quizFilteredTopics.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No topics for this subject. Add topics first.</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Time Limit (minutes)</label>
            <Input
              type="number"
              value={quizForm.time_limit_minutes}
              onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: Number(e.target.value) })}
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pass Percentage</label>
            <Input
              type="number"
              value={quizForm.pass_percentage}
              onChange={(e) => setQuizForm({ ...quizForm, pass_percentage: Number(e.target.value) })}
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier</label>
            <select
              value={quizForm.min_tier}
              onChange={(e) => setQuizForm({ ...quizForm, min_tier: e.target.value as TierType })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(TIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={quizForm.description}
              onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>

          {quizForm.topic_id && (
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-2 block">
                Select Questions ({quizForm.question_ids.length} selected)
              </label>
              {topicQuestions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No questions for this topic. Add questions first.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-2">
                  {topicQuestions.map((q) => (
                    <label key={q.id} className="flex items-start gap-2 p-2 rounded hover:bg-secondary cursor-pointer">
                      <Checkbox
                        checked={quizForm.question_ids.includes(q.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setQuizForm({ ...quizForm, question_ids: [...quizForm.question_ids, q.id] });
                          } else {
                            setQuizForm({ ...quizForm, question_ids: quizForm.question_ids.filter(id => id !== q.id) });
                          }
                        }}
                      />
                      <span className="text-sm text-foreground">{q.question_text}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button variant="brand" size="sm" onClick={handleAddQuiz} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Quiz
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand" />
            Quizzes ({quizzes.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchQuizzes}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No quizzes yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium text-sm">{quiz.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground text-xs">{quiz.question_ids.length} questions</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">{quiz.time_limit_minutes} min</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">{quiz.pass_percentage}% to pass</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteQuiz(quiz.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Flashcards View
  const renderFlashcards = () => (
    <>
      {!selectedFlashcardSet ? (
        <>
          <div className="glass-card p-5 mb-6">
            <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" />
              Create Flashcard Set
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Set Title *</label>
                <Input
                  value={flashcardSetForm.title}
                  onChange={(e) => setFlashcardSetForm({ ...flashcardSetForm, title: e.target.value })}
                  placeholder="e.g., Chapter 1 Vocabulary"
                  className="bg-secondary border-border h-9"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={flashcardSubjectSearch}
                    onChange={(e) => setFlashcardSubjectSearch(e.target.value)}
                    placeholder="Search subjects..."
                    className="bg-secondary border-border h-9 pl-10"
                  />
                </div>
                <select
                  value={flashcardSubjectId}
                  onChange={(e) => {
                    setFlashcardSubjectId(e.target.value);
                    setFlashcardSetForm({ ...flashcardSetForm, topic_id: '' });
                  }}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm mt-2"
                >
                  <option value="">Select subject first...</option>
                  {filterSubjects(flashcardSubjectSearch).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} - {GRADE_LABELS[subject.grade]} {STREAM_LABELS[subject.stream]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Topic *</label>
                <select
                  value={flashcardSetForm.topic_id}
                  onChange={(e) => setFlashcardSetForm({ ...flashcardSetForm, topic_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                  disabled={!flashcardSubjectId}
                >
                  <option value="">{flashcardSubjectId ? 'Select topic...' : 'Select subject first'}</option>
                  {flashcardFilteredTopics.map((topic: any) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
                {flashcardSubjectId && flashcardFilteredTopics.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No topics for this subject. Add topics first.</p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier</label>
                <select
                  value={flashcardSetForm.min_tier}
                  onChange={(e) => setFlashcardSetForm({ ...flashcardSetForm, min_tier: e.target.value as TierType })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                >
                  {Object.entries(TIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Input
                  value={flashcardSetForm.description}
                  onChange={(e) => setFlashcardSetForm({ ...flashcardSetForm, description: e.target.value })}
                  placeholder="Brief description"
                  className="bg-secondary border-border h-9"
                />
              </div>
            </div>

            <Button variant="brand" size="sm" onClick={handleAddFlashcardSet} disabled={isAdding}>
              {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Set
            </Button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" />
                Flashcard Sets ({flashcardSets.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchFlashcardSets}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : flashcardSets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No flashcard sets yet. Create one above.</div>
            ) : (
              <div className="divide-y divide-border">
                {flashcardSets.map((set) => (
                  <div key={set.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                    <button onClick={() => setSelectedFlashcardSet(set)} className="flex-1 text-left">
                      <p className="text-foreground font-medium text-sm">{set.title}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {set.card_count || 0} cards • {TIER_LABELS[set.min_tier as TierType]}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFlashcardSet(set)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteFlashcardSet(set.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm mb-4">
            <button onClick={() => setSelectedFlashcardSet(null)} className="text-brand hover:underline">
              Flashcard Sets
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{selectedFlashcardSet.title}</span>
          </div>

          <div className="glass-card p-5 mb-6">
            <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" />
              Add Flashcard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Front (Question/Term) *</label>
                <Textarea
                  value={flashcardForm.front_text}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, front_text: e.target.value })}
                  placeholder="Enter front text..."
                  className="bg-secondary border-border min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Back (Answer/Definition) *</label>
                <Textarea
                  value={flashcardForm.back_text}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, back_text: e.target.value })}
                  placeholder="Enter back text..."
                  className="bg-secondary border-border min-h-[80px]"
                />
              </div>
            </div>

            <Button variant="brand" size="sm" onClick={handleAddFlashcard} disabled={isAdding}>
              {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Card
            </Button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" />
                Cards ({flashcards.length})
              </h2>
            </div>

            {flashcards.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No cards yet. Add one above.</div>
            ) : (
              <div className="divide-y divide-border">
                {flashcards.map((card, idx) => (
                  <div key={card.id} className="p-4 hover:bg-secondary/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-muted-foreground text-xs">#{idx + 1}</span>
                        </div>
                        <p className="text-foreground text-sm font-medium mb-1">Front: {card.front_text}</p>
                        <p className="text-muted-foreground text-sm">Back: {card.back_text}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteFlashcard(card.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">Content Management</h1>
              <p className="text-muted-foreground text-sm">Manage subjects, topics, notes, questions, quizzes, and flashcards</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Questions</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Flashcards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            {renderBreadcrumb()}
            {!selectedSubject && renderSubjectList()}
            {selectedSubject && !selectedTopic && renderTopicList()}
            {selectedSubject && selectedTopic && renderNotesList()}
          </TabsContent>

          <TabsContent value="questions">
            {renderQuestionBank()}
          </TabsContent>

          <TabsContent value="quizzes">
            {renderQuizzes()}
          </TabsContent>

          <TabsContent value="flashcards">
            {renderFlashcards()}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default ContentManagement;
