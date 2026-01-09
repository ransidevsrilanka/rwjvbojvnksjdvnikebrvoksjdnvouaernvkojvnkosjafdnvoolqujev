import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  Ban,
  RefreshCw,
  User,
  Clock,
  Flag,
  CheckCircle,
} from 'lucide-react';

interface FlaggedUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  abuse_flags: number;
  is_locked: boolean;
  downloads_disabled: boolean;
  created_at: string;
}

interface SuspiciousActivity {
  id: string;
  user_id: string;
  email: string | null;
  activity_type: string;
  details: string;
  created_at: string;
}

const Security = () => {
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSecurityData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch flagged/locked profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, abuse_flags, is_locked, downloads_disabled, created_at')
        .or('abuse_flags.gt.0,is_locked.eq.true,downloads_disabled.eq.true')
        .order('abuse_flags', { ascending: false });

      setFlaggedUsers(profiles || []);

      // Fetch recent download logs for monitoring
      const { data: downloads } = await supabase
        .from('download_logs')
        .select(`
          id,
          user_id,
          file_name,
          ip_address,
          user_agent,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setRecentDownloads(downloads || []);

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data');
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleToggleLock = async (userId: string, currentlyLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_locked: !currentlyLocked })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(currentlyLocked ? 'User unlocked' : 'User locked');
      fetchSecurityData();
    } catch (error: any) {
      toast.error('Failed to update user: ' + error.message);
    }
  };

  const handleToggleDownloads = async (userId: string, currentlyDisabled: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ downloads_disabled: !currentlyDisabled })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(currentlyDisabled ? 'Downloads enabled' : 'Downloads disabled');
      fetchSecurityData();
    } catch (error: any) {
      toast.error('Failed to update user: ' + error.message);
    }
  };

  const handleClearFlags = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ abuse_flags: 0 })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Abuse flags cleared');
      fetchSecurityData();
    } catch (error: any) {
      toast.error('Failed to clear flags: ' + error.message);
    }
  };

  // Group downloads by user to detect suspicious patterns
  const downloadsByUser = recentDownloads.reduce((acc, dl) => {
    if (!acc[dl.user_id]) {
      acc[dl.user_id] = [];
    }
    acc[dl.user_id].push(dl);
    return acc;
  }, {} as Record<string, any[]>);

  // Find users with many downloads in short time (potential abuse)
  const suspiciousDownloaders = Object.entries(downloadsByUser)
    .filter(([, downloads]) => (downloads as any[]).length >= 5)
    .map(([userId, downloads]) => ({
      user_id: userId,
      count: (downloads as any[]).length,
      latest: (downloads as any[])[0],
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading security data...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Security & Abuse</h1>
                <p className="text-sm text-muted-foreground">Monitor suspicious activity</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSecurityData}
              disabled={isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Flag className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{flaggedUsers.filter(u => u.abuse_flags > 0).length}</p>
                <p className="text-xs text-muted-foreground">Flagged Users</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{flaggedUsers.filter(u => u.is_locked).length}</p>
                <p className="text-xs text-muted-foreground">Locked Accounts</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{flaggedUsers.filter(u => u.downloads_disabled).length}</p>
                <p className="text-xs text-muted-foreground">Downloads Disabled</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{suspiciousDownloaders.length}</p>
                <p className="text-xs text-muted-foreground">High Download Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flagged Users Section */}
        <div className="glass-card p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" />
            Flagged & Locked Users
          </h2>

          {flaggedUsers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-muted-foreground">No flagged users. All clear! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedUsers.map((user) => (
                <div key={user.id} className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.full_name || user.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {user.abuse_flags > 0 && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                              {user.abuse_flags} flags
                            </span>
                          )}
                          {user.is_locked && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">
                              Locked
                            </span>
                          )}
                          {user.downloads_disabled && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                              No Downloads
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.abuse_flags > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearFlags(user.user_id)}
                        >
                          Clear Flags
                        </Button>
                      )}
                      <Button
                        variant={user.is_locked ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => handleToggleLock(user.user_id, user.is_locked)}
                      >
                        {user.is_locked ? (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            Lock
                          </>
                        )}
                      </Button>
                      <Button
                        variant={user.downloads_disabled ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleDownloads(user.user_id, user.downloads_disabled)}
                      >
                        {user.downloads_disabled ? 'Enable DL' : 'Disable DL'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspicious Download Activity */}
        <div className="glass-card p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            High Download Activity (5+ downloads recently)
          </h2>

          {suspiciousDownloaders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-muted-foreground">No suspicious download patterns detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suspiciousDownloaders.map((item) => (
                <div key={item.user_id} className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm font-mono">
                        {item.user_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.count} downloads • Last: {new Date(item.latest.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                      {item.count} downloads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Download Logs */}
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Recent Download Logs
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">User ID</th>
                  <th className="pb-3 font-medium">File</th>
                  <th className="pb-3 font-medium">IP Address</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentDownloads.slice(0, 20).map((dl) => (
                  <tr key={dl.id} className="border-b border-border/50">
                    <td className="py-3 text-foreground font-mono text-xs">
                      {dl.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-muted-foreground truncate max-w-[200px]">
                      {dl.file_name || 'Unknown'}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {dl.ip_address || 'N/A'}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(dl.created_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recentDownloads.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No download logs yet</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Security;