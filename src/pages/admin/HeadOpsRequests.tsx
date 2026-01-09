import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface HeadOpsRequest {
  id: string;
  request_type: string;
  target_id: string | null;
  target_type: string | null;
  details: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
  requester_id: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const HeadOpsRequests = () => {
  const [requests, setRequests] = useState<HeadOpsRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('head_ops_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } else {
      setRequests(data || []);
      
      // Fetch requester profiles
      const requesterIds = [...new Set((data || []).map(r => r.requester_id))];
      if (requesterIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .in('user_id', requesterIds);
        
        if (profileData) {
          const profileMap: Record<string, Profile> = {};
          profileData.forEach(p => {
            profileMap[p.user_id] = p;
          });
          setProfiles(profileMap);
        }
      }
    }
    
    setIsLoading(false);
  };

  const handleApprove = async (request: HeadOpsRequest) => {
    setProcessingId(request.id);
    
    const notes = adminNotes[request.id] || '';
    
    const { error } = await supabase
      .from('head_ops_requests')
      .update({
        status: 'approved',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to approve request');
    } else {
      toast.success('Request approved');
      
      // Execute the action based on request type
      if (request.target_id) {
        if (request.request_type === 'remove_creator' || request.request_type === 'suspend_creator') {
          await supabase
            .from('creator_profiles')
            .update({ is_active: false })
            .eq('id', request.target_id);
        } else if (request.request_type === 'remove_cmo' || request.request_type === 'demote_cmo') {
          await supabase
            .from('cmo_profiles')
            .update({ is_active: false })
            .eq('id', request.target_id);
        }
      }
      
      fetchRequests();
    }
    
    setProcessingId(null);
  };

  const handleReject = async (request: HeadOpsRequest) => {
    setProcessingId(request.id);
    
    const notes = adminNotes[request.id] || '';
    
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection');
      setProcessingId(null);
      return;
    }
    
    const { error } = await supabase
      .from('head_ops_requests')
      .update({
        status: 'rejected',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Request rejected');
      fetchRequests();
    }
    
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'remove_cmo': 'Remove CMO',
      'demote_cmo': 'Demote CMO',
      'remove_creator': 'Remove Creator',
      'suspend_creator': 'Suspend Creator',
      'enforce_deadline': 'Enforce Deadline',
      'flag_content': 'Flag Content Issue',
      'escalate': 'Escalate Issue'
    };
    return labels[type] || type;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">Head of Ops Requests</h1>
              <p className="text-muted-foreground text-sm">Review and process operational requests</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Pending Requests */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Requests awaiting admin approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => {
                  const requester = profiles[request.requester_id];
                  
                  return (
                    <div key={request.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getRequestTypeLabel(request.request_type)}</Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <p className="text-sm text-foreground mb-2">
                            {request.details?.description || 'No details provided'}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>From: {requester?.full_name || requester?.email || 'Unknown'}</span>
                            <span>•</span>
                            <span>{new Date(request.created_at).toLocaleString()}</span>
                          </div>
                          
                          <div className="mt-3">
                            <Textarea
                              value={adminNotes[request.id] || ''}
                              onChange={(e) => setAdminNotes({ ...adminNotes, [request.id]: e.target.value })}
                              placeholder="Admin notes (required for rejection)..."
                              className="text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(request)}
                            disabled={processingId === request.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Requests */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Previously processed requests</CardDescription>
          </CardHeader>
          <CardContent>
            {processedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No processed requests</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {processedRequests.map((request) => {
                  const requester = profiles[request.requester_id];
                  
                  return (
                    <div key={request.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{getRequestTypeLabel(request.request_type)}</Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                        {request.details?.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        From: {requester?.full_name || 'Unknown'}
                      </p>
                      {request.admin_notes && (
                        <p className="text-xs text-brand mt-2 italic border-t border-border pt-2">
                          Admin: {request.admin_notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default HeadOpsRequests;