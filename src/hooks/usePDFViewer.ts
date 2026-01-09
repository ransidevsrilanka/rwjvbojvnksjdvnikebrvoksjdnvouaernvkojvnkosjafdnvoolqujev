import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDFViewerState {
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  pdfUrl: string | null;
  watermark: {
    fullName?: string;
    email: string;
    oderId: string;
    timestamp?: string;
    userId?: string;
  } | null;
  canDownload: boolean;
  noteTitle: string | null;
  currentPage: number;
  totalPages: number;
  scale: number;
}

interface UsePDFViewerReturn extends PDFViewerState {
  loadPDF: (noteId: string) => Promise<boolean>;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setScale: (scale: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  clearPDF: () => void;
  saveProgress: () => void;
  loadProgress: (noteId: string) => number;
}

const STORAGE_KEY_PREFIX = 'studyvault_pdf_progress_';
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function usePDFViewer(): UsePDFViewerReturn {
  const { user } = useAuth();
  const [state, setState] = useState<PDFViewerState>({
    isLoading: false,
    error: null,
    errorCode: null,
    pdfUrl: null,
    watermark: null,
    canDownload: false,
    noteTitle: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1,
  });
  
  const currentNoteIdRef = useRef<string | null>(null);

  // Clear cached URLs on logout
  useEffect(() => {
    if (!user) {
      clearPDF();
      // Clear all progress data on logout
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [user]);

  const loadPDF = useCallback(async (noteId: string): Promise<boolean> => {
    if (!user) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please sign in to view this content',
        errorCode: 'NOT_AUTHENTICATED',
        isLoading: false 
      }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, errorCode: null }));
    currentNoteIdRef.current = noteId;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('serve-pdf', {
        body: { noteId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load PDF');
      }

      const data = response.data;

      if (!data.signedUrl) {
        throw new Error('No PDF URL received');
      }

      // Load saved progress
      const savedPage = loadProgress(noteId);

      setState(prev => ({
        ...prev,
        isLoading: false,
        pdfUrl: data.signedUrl,
        watermark: data.watermark ? {
          fullName: data.watermark.fullName,
          email: data.watermark.email,
          oderId: data.watermark.oderId,
          timestamp: data.watermark.timestamp,
          userId: data.watermark.userId,
        } : null,
        canDownload: data.canDownload ?? false,
        noteTitle: data.noteTitle,
        currentPage: savedPage,
        error: null,
        errorCode: null,
      }));

      return true;
    } catch (error: any) {
      console.error('PDF load error:', error);
      
      // Try to parse error from response
      let errorMessage = 'Failed to load PDF';
      let errorCode = 'UNKNOWN_ERROR';

      if (error.message) {
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || errorMessage;
          errorCode = parsed.code || errorCode;
        } catch {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        errorCode: errorCode,
        pdfUrl: null,
      }));

      return false;
    }
  }, [user]);

  const setCurrentPage = useCallback((page: number) => {
    setState(prev => {
      const newPage = Math.max(1, Math.min(page, prev.totalPages || 1));
      return { ...prev, currentPage: newPage };
    });
  }, []);

  const setTotalPages = useCallback((total: number) => {
    setState(prev => ({ ...prev, totalPages: total }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setState(prev => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.min(prev.currentPage + 1, prev.totalPages || 1),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(prev.currentPage - 1, 1),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.min(prev.scale + SCALE_STEP, MAX_SCALE),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.max(prev.scale - SCALE_STEP, MIN_SCALE),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState(prev => ({ ...prev, scale: 1 }));
  }, []);

  const clearPDF = useCallback(() => {
    currentNoteIdRef.current = null;
    setState({
      isLoading: false,
      error: null,
      errorCode: null,
      pdfUrl: null,
      watermark: null,
      canDownload: false,
      noteTitle: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1,
    });
  }, []);

  const saveProgress = useCallback(() => {
    if (currentNoteIdRef.current && state.currentPage > 0) {
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${currentNoteIdRef.current}`,
        state.currentPage.toString()
      );
    }
  }, [state.currentPage]);

  const loadProgress = useCallback((noteId: string): number => {
    const saved = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${noteId}`);
    return saved ? parseInt(saved, 10) : 1;
  }, []);

  // Auto-save progress when page changes
  useEffect(() => {
    saveProgress();
  }, [state.currentPage, saveProgress]);

  return {
    ...state,
    loadPDF,
    setCurrentPage,
    setTotalPages,
    setScale,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    clearPDF,
    saveProgress,
    loadProgress,
  };
}
