import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ArrowLeft, 
  Users,
  RefreshCw,
  Calendar,
  Shield,
  Ban,
  BookOpen,
  Unlock,
  Eye,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS } from '@/types/database';
import type { Enrollment, Profile } from '@/types/database';

interface UserSubjectsData {
  id: string;
  user_id: string;
  enrollment_id: string;
  subject_1: string;
  subject_2: string;
  subject_3: string;
  is_locked: boolean;
  locked_at: string | null;
}

interface EnrollmentWithProfile extends Enrollment {
  profiles: Profile;
  user_subjects?: UserSubjectsData | null;
}

const Enrollments = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; enrollment: EnrollmentWithProfile | null }>({
    open: false,
    enrollment: null,
  });

  const fetchEnrollments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profiles separately
      const userIds = data.map(e => e.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      // Fetch user_subjects for all enrollments
      const enrollmentIds = data.map(e => e.id);
      const { data: userSubjectsData } = await supabase
        .from('user_subjects')
        .select('*')
        .in('enrollment_id', enrollmentIds);
      
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const subjectsMap = new Map((userSubjectsData || []).map(s => [s.enrollment_id, s]));
      
      const enriched = data.map(e => ({
        ...e,
        profiles: profilesMap.get(e.user_id) as Profile,
        user_subjects: subjectsMap.get(e.id) as UserSubjectsData | null,
      }));
      setEnrollments(enriched as EnrollmentWithProfile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const toggleEnrollment = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update enrollment');
    } else {
      toast.success(isActive ? 'Enrollment deactivated' : 'Enrollment activated');
      fetchEnrollments();
    }
  };

  const extendEnrollment = async (id: string, days: number) => {
    const enrollment = enrollments.find(e => e.id === id);
    if (!enrollment) return;

    const currentExpiry = enrollment.expires_at 
      ? new Date(enrollment.expires_at) 
      : new Date();
    
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('enrollments')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to extend enrollment');
    } else {
      toast.success(`Extended by ${days} days`);
      fetchEnrollments();
    }
  };

  const unlockSubjectSelection = async (enrollment: EnrollmentWithProfile) => {
    if (!enrollment.user_subjects) return;

    const { error } = await supabase
      .from('user_subjects')
      .update({ 
        is_locked: false,
        locked_at: null,
        locked_by: null
      })
      .eq('id', enrollment.user_subjects.id);

    if (error) {
      toast.error('Failed to unlock subject selection');
    } else {
      toast.success('Subject selection unlocked. User can now change their subjects.');
      fetchEnrollments();
    }
    setUnlockDialog({ open: false, enrollment: null });
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Filter enrollments based on search query
  const filteredEnrollments = enrollments.filter(enrollment => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const name = enrollment.profiles?.full_name?.toLowerCase() || '';
    const email = enrollment.profiles?.email?.toLowerCase() || '';
    const subject1 = enrollment.user_subjects?.subject_1?.toLowerCase() || '';
    const subject2 = enrollment.user_subjects?.subject_2?.toLowerCase() || '';
    const subject3 = enrollment.user_subjects?.subject_3?.toLowerCase() || '';
    
    return (
      name.includes(search) ||
      email.includes(search) ||
      subject1.includes(search) ||
      subject2.includes(search) ||
      subject3.includes(search)
    );
  });

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Enrollments</h1>
              <p className="text-muted-foreground text-sm">Manage student enrollments and subject selections</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              All Enrollments ({filteredEnrollments.length})
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-secondary border-border"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={fetchEnrollments}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No enrollments match your search' : 'No enrollments yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Student</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Grade</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Stream</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Medium</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Tier</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Subjects</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-muted-foreground text-sm font-medium">Expires</th>
                    <th className="text-right p-3 text-muted-foreground text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((enrollment) => {
                    const expiresAt = enrollment.expires_at ? new Date(enrollment.expires_at) : null;
                    const isExpired = expiresAt && expiresAt < new Date();
                    const hasSubjects = !!enrollment.user_subjects;
                    const isSubjectsLocked = enrollment.user_subjects?.is_locked ?? false;
                    const isExpanded = expandedRow === enrollment.id;
                    
                    return (
                      <>
                        <tr key={enrollment.id} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-3">
                            <div>
                              <p className="text-foreground font-medium">
                                {enrollment.profiles?.full_name || 'Unknown'}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {enrollment.profiles?.email}
                              </p>
                            </div>
                          </td>
                          <td className="p-3 text-foreground text-sm">{GRADE_LABELS[enrollment.grade]}</td>
                          <td className="p-3 text-foreground text-sm">{STREAM_LABELS[enrollment.stream]}</td>
                          <td className="p-3 text-foreground text-sm">{MEDIUM_LABELS[enrollment.medium]}</td>
                          <td className="p-3 text-foreground text-sm">{TIER_LABELS[enrollment.tier]}</td>
                          <td className="p-3">
                            {hasSubjects ? (
                              <button
                                onClick={() => toggleRowExpand(enrollment.id)}
                                className="flex items-center gap-1.5 text-sm"
                              >
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  isSubjectsLocked 
                                    ? 'text-green-500 bg-green-500/10' 
                                    : 'text-yellow-500 bg-yellow-500/10'
                                }`}>
                                  {isSubjectsLocked ? 'Locked' : 'Unlocked'}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </button>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-medium text-muted-foreground bg-secondary">
                                Not Selected
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              !enrollment.is_active 
                                ? 'text-red-500 bg-red-500/10'
                                : isExpired
                                  ? 'text-orange-500 bg-orange-500/10'
                                  : 'text-green-500 bg-green-500/10'
                            }`}>
                              {!enrollment.is_active ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-sm">
                            {enrollment.tier === 'lifetime' 
                              ? 'Never' 
                              : expiresAt?.toLocaleDateString() || '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              {hasSubjects && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpand(enrollment.id)}
                                  title="View subjects"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {hasSubjects && isSubjectsLocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUnlockDialog({ open: true, enrollment })}
                                  title="Unlock subject selection"
                                  className="text-yellow-500 hover:text-yellow-500"
                                >
                                  <Unlock className="w-4 h-4" />
                                </Button>
                              )}
                              {enrollment.tier !== 'lifetime' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => extendEnrollment(enrollment.id, 30)}
                                  title="Extend by 30 days"
                                >
                                  <Calendar className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEnrollment(enrollment.id, enrollment.is_active)}
                                className={enrollment.is_active ? 'text-destructive hover:text-destructive' : 'text-green-500 hover:text-green-500'}
                              >
                                {enrollment.is_active ? <Ban className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row showing subjects */}
                        {isExpanded && enrollment.user_subjects && (
                          <tr key={`${enrollment.id}-subjects`} className="bg-secondary/20">
                            <td colSpan={9} className="p-4">
                              <div className="flex items-start gap-4">
                                <BookOpen className="w-5 h-5 text-brand mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-foreground mb-2">Selected Subjects:</p>
                                  <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm">
                                      {enrollment.user_subjects.subject_1}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm">
                                      {enrollment.user_subjects.subject_2}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm">
                                      {enrollment.user_subjects.subject_3}
                                    </span>
                                  </div>
                                  {enrollment.user_subjects.locked_at && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Locked on: {new Date(enrollment.user_subjects.locked_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unlock Subject Selection Dialog */}
      <AlertDialog open={unlockDialog.open} onOpenChange={(open) => setUnlockDialog({ open, enrollment: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Subject Selection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock subject selection for{' '}
              <strong>{unlockDialog.enrollment?.profiles?.full_name || unlockDialog.enrollment?.profiles?.email}</strong>?
              <br /><br />
              This will allow the student to change their subjects. They will need to re-confirm their selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlockDialog.enrollment && unlockSubjectSelection(unlockDialog.enrollment)}>
              Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Enrollments;