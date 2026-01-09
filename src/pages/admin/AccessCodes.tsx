import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Key, 
  Plus, 
  Copy, 
  Check,
  Trash2,
  RefreshCw,
  QrCode,
  X,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import type { AccessCode, GradeLevel, StreamType, MediumType, TierType } from '@/types/database';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS } from '@/types/database';
import { QRCodeSVG } from 'qrcode.react';
import { useBranding } from '@/hooks/useBranding';

const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SV-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AccessCodes = () => {
  const { user } = useAuth();
  const { branding } = useBranding();
  const [codes, setCodes] = useState<(AccessCode & { user_profile?: { full_name: string | null; email: string } | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<{ code: string; url: string } | null>(null);

  // Form state
  const [grade, setGrade] = useState<GradeLevel>('al_grade13');
  const [stream, setStream] = useState<StreamType | null>('maths');
  
  // Helper to check if current grade is O/L
  const isOLevelGrade = grade?.startsWith('ol_');
  const [medium, setMedium] = useState<MediumType>('english');
  const [tier, setTier] = useState<TierType>('standard');
  const [durationDays, setDurationDays] = useState(365);
  const [quantity, setQuantity] = useState(1);

  const fetchCodes = async () => {
    setIsLoading(true);
    
    // First fetch access codes
    const { data: codesData, error: codesError } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (codesError || !codesData) {
      setIsLoading(false);
      return;
    }

    // Get unique user IDs that activated codes
    const userIds = codesData
      .filter(code => code.activated_by)
      .map(code => code.activated_by as string);

    // Fetch profiles for those users
    let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesData) {
        profilesMap = profilesData.reduce((acc, profile) => {
          acc[profile.id] = { full_name: profile.full_name, email: profile.email };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string }>);
      }
    }

    // Merge profile data with codes
    const codesWithProfiles = codesData.map(code => ({
      ...code,
      user_profile: code.activated_by ? profilesMap[code.activated_by] : null
    }));

    setCodes(codesWithProfiles as any);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleGenerate = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    const newCodes = [];

    for (let i = 0; i < quantity; i++) {
      newCodes.push({
        code: generateCode(),
        grade,
        stream: isOLevelGrade ? null : stream, // O/L students don't have streams
        medium,
        tier,
        duration_days: tier === 'lifetime' ? 0 : durationDays,
        created_by: user.id,
      });
    }

    const { error } = await supabase
      .from('access_codes')
      .insert(newCodes);

    if (error) {
      toast.error('Failed to generate codes');
    } else {
      toast.success(`Generated ${quantity} access code(s)`);
      fetchCodes();
    }
    setIsGenerating(false);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeCode = async (id: string) => {
    const { error } = await supabase
      .from('access_codes')
      .update({ status: 'revoked' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to revoke code');
    } else {
      toast.success('Code revoked');
      fetchCodes();
    }
  };

  const showQrCode = (code: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/access?code=${code}`;
    setQrCode({ code, url });
  };

  const downloadQrCode = () => {
    if (!qrCode) return;
    
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `${branding.siteName.replace(/\s+/g, '')}-${qrCode.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const statusColors = {
    active: 'text-green-500 bg-green-500/10',
    used: 'text-blue-500 bg-blue-500/10',
    expired: 'text-orange-500 bg-orange-500/10',
    revoked: 'text-red-500 bg-red-500/10',
  };

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      {/* QR Code Modal */}
      {qrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">QR Code</h3>
              <Button variant="ghost" size="sm" onClick={() => setQrCode(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="bg-white p-4 rounded-lg mb-4 flex justify-center">
              <QRCodeSVG 
                id="qr-code-svg"
                value={qrCode.url} 
                size={200}
                level="H"
                includeMargin
              />
            </div>
            
            <p className="text-center font-mono text-brand text-lg mb-2">{qrCode.code}</p>
            <p className="text-center text-muted-foreground text-xs mb-4 break-all">{qrCode.url}</p>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(qrCode.url);
                  toast.success('URL copied!');
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </Button>
              <Button 
                variant="brand" 
                className="flex-1"
                onClick={downloadQrCode}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">Access Codes</h1>
              <p className="text-muted-foreground text-sm">Generate and manage access codes</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Generator Form */}
        <div className="glass-card p-5 mb-6">
          <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            Generate New Codes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
              >
                {Object.entries(GRADE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {!isOLevelGrade && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stream</label>
                <select
                  value={stream || 'maths'}
                  onChange={(e) => setStream(e.target.value as StreamType)}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                >
                  {Object.entries(STREAM_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}
            {isOLevelGrade && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stream</label>
                <div className="w-full h-9 px-3 rounded-md bg-muted border border-border text-muted-foreground text-sm flex items-center">
                  Not applicable for O/L
                </div>
              </div>
            )}

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

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TierType)}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
              >
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (days)</label>
              <Input
                type="number"
                value={tier === 'lifetime' ? 0 : durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                disabled={tier === 'lifetime'}
                className="bg-secondary border-border h-9"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="bg-secondary border-border h-9"
              />
            </div>
          </div>

          <Button variant="brand" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Key className="w-4 h-4 mr-2" />
            )}
            Generate {quantity} Code{quantity > 1 ? 's' : ''}
          </Button>
        </div>

        {/* Codes List */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-medium text-foreground text-sm">Generated Codes</h2>
            <Button variant="ghost" size="sm" onClick={fetchCodes}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : codes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No codes generated yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Code</th>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Grade</th>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Stream</th>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Tier</th>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Status</th>
                    <th className="text-left p-3 text-muted-foreground text-xs font-medium">Bound To</th>
                    <th className="text-right p-3 text-muted-foreground text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3">
                        <code className="font-mono text-brand text-sm">{code.code}</code>
                      </td>
                      <td className="p-3 text-foreground text-sm">{GRADE_LABELS[code.grade]}</td>
                      <td className="p-3 text-foreground text-sm">{code.stream ? STREAM_LABELS[code.stream] : '—'}</td>
                      <td className="p-3 text-foreground text-sm">{TIER_LABELS[code.tier]}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[code.status]}`}>
                          {code.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {code.user_profile ? (
                          <div>
                            <p className="text-foreground font-medium">
                              {code.user_profile.full_name || 'No name'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {code.user_profile.email}
                            </p>
                          </div>
                        ) : code.bound_email ? (
                          <span className="text-muted-foreground">{code.bound_email}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showQrCode(code.code)}
                            title="Show QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code, code.id)}
                          >
                            {copiedId === code.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          {code.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeCode(code.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AccessCodes;