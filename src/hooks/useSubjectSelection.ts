import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  validateSubjectSelection, 
  validateOLSelection,
  getMandatorySubjects, 
  groupSubjectsByBasket,
  type StreamSubject,
  type ValidationResult 
} from '@/lib/subjectValidation';
import type { StreamType } from '@/types/database';

export interface UserSubjects {
  id: string;
  user_id: string;
  enrollment_id: string;
  subject_1: string;
  subject_2: string;
  subject_3: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubjectSelection() {
  const { user, enrollment } = useAuth();
  const [streamSubjects, setStreamSubjects] = useState<StreamSubject[]>([]);
  const [userSubjects, setUserSubjects] = useState<UserSubjects | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({ valid: false, errors: [], warnings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // O/L specific state
  const [firstLanguage, setFirstLanguage] = useState<string>('');
  const [religion, setReligion] = useState<string>('');

  const stream = enrollment?.stream as StreamType | undefined;
  const grade = enrollment?.grade;
  const isOL = grade === 'ol_grade10' || grade === 'ol_grade11';

  // Fetch stream subjects and user's existing selection
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !enrollment) return;

      setIsLoading(true);

      // For O/L, we fetch 'ol' stream subjects
      // For A/L, we fetch the specific stream
      const queryStream = isOL ? 'ol' : stream;
      
      if (!queryStream) {
        setIsLoading(false);
        return;
      }

      // Fetch subjects for this stream
      const { data: subjects, error: subjectsError } = await supabase
        .from('stream_subjects')
        .select('*')
        .eq('stream', queryStream)
        .order('sort_order');

      if (subjectsError) {
        console.error('Error fetching stream subjects:', subjectsError);
        setIsLoading(false);
        return;
      }

      setStreamSubjects(subjects as StreamSubject[]);

      // Fetch user's existing subject selection
      const { data: existingSelection, error: selectionError } = await supabase
        .from('user_subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('enrollment_id', enrollment.id)
        .maybeSingle();

      if (selectionError) {
        console.error('Error fetching user subjects:', selectionError);
      }

      if (existingSelection) {
        setUserSubjects(existingSelection as UserSubjects);
        setSelectedSubjects([
          existingSelection.subject_1,
          existingSelection.subject_2,
          existingSelection.subject_3,
        ].filter(Boolean));
      } else if (!isOL) {
        // Pre-select mandatory subjects for A/L only
        const mandatory = getMandatorySubjects(stream!, subjects as StreamSubject[]);
        setSelectedSubjects(mandatory);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user, enrollment, stream, isOL]);

  // Validate whenever selection changes
  useEffect(() => {
    if (isOL) {
      // O/L validation - needs 3 optional subjects (1 from each basket)
      const result = validateOLSelection(selectedSubjects, streamSubjects, firstLanguage, religion);
      setValidation(result);
    } else if (stream) {
      // A/L validation
      const result = validateSubjectSelection(stream, selectedSubjects, streamSubjects);
      setValidation(result);
    }
  }, [selectedSubjects, stream, streamSubjects, isOL, firstLanguage, religion]);

  // Toggle subject selection
  const toggleSubject = useCallback((subjectName: string) => {
    if (isOL) {
      // For O/L, we need to enforce one from each basket
      const subject = streamSubjects.find(s => s.subject_name === subjectName);
      if (!subject) return;
      
      // If already selected, remove it
      if (selectedSubjects.includes(subjectName)) {
        setSelectedSubjects(prev => prev.filter(s => s !== subjectName));
        return;
      }
      
      // Check if another subject from the same basket is selected
      const sameBucketSubject = selectedSubjects.find(selected => {
        const selSubj = streamSubjects.find(s => s.subject_name === selected);
        return selSubj?.basket === subject.basket;
      });
      
      if (sameBucketSubject) {
        // Replace the subject in same basket
        setSelectedSubjects(prev => 
          prev.filter(s => s !== sameBucketSubject).concat(subjectName)
        );
      } else if (selectedSubjects.length < 3) {
        // Add new subject
        setSelectedSubjects(prev => [...prev, subjectName]);
      }
    } else {
      // A/L logic
      // Check if subject is mandatory (can't deselect)
      const mandatory = getMandatorySubjects(stream!, streamSubjects);
      if (mandatory.includes(subjectName) && selectedSubjects.includes(subjectName)) {
        return; // Can't deselect mandatory subjects
      }

      setSelectedSubjects(prev => {
        if (prev.includes(subjectName)) {
          return prev.filter(s => s !== subjectName);
        } else if (prev.length < 3) {
          return [...prev, subjectName];
        }
        return prev;
      });
    }
  }, [stream, streamSubjects, selectedSubjects, isOL]);

  // Save and lock subject selection
  const saveSelection = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !enrollment || selectedSubjects.length !== 3) {
      return { success: false, error: 'Invalid selection' };
    }

    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    setIsSaving(true);

    try {
      const payload = {
        user_id: user.id,
        enrollment_id: enrollment.id,
        subject_1: selectedSubjects[0],
        subject_2: selectedSubjects[1],
        subject_3: selectedSubjects[2],
        is_locked: true,
        locked_at: new Date().toISOString(),
      };

      if (userSubjects) {
        // Update existing
        const { error } = await supabase
          .from('user_subjects')
          .update(payload)
          .eq('id', userSubjects.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_subjects')
          .insert(payload);

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error saving subject selection:', error);
      return { success: false, error: error.message || 'Failed to save selection' };
    } finally {
      setIsSaving(false);
    }
  }, [user, enrollment, selectedSubjects, validation, userSubjects]);

  // Group subjects by basket for display
  const subjectsByBasket = groupSubjectsByBasket(streamSubjects);
  const mandatorySubjects = isOL ? [] : (stream ? getMandatorySubjects(stream, streamSubjects) : []);

  // Get O/L specific subject groups
  const olMandatorySubjects = isOL 
    ? streamSubjects.filter(s => s.is_mandatory) 
    : [];
  const olReligionOptions = isOL 
    ? streamSubjects.filter(s => s.basket === 'religion' && s.is_mandatory) 
    : [];
  const olFirstLanguageOptions = isOL
    ? streamSubjects.filter(s => s.basket === 'mandatory' && s.subject_name.startsWith('First Language'))
    : [];

  return {
    streamSubjects,
    subjectsByBasket,
    userSubjects,
    selectedSubjects,
    mandatorySubjects,
    validation,
    isLoading,
    isSaving,
    isLocked: userSubjects?.is_locked ?? false,
    isOL,
    // O/L specific
    firstLanguage,
    setFirstLanguage,
    religion,
    setReligion,
    olMandatorySubjects,
    olReligionOptions,
    olFirstLanguageOptions,
    toggleSubject,
    saveSelection,
  };
}
