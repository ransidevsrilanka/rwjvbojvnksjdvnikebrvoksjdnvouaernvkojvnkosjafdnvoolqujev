import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  Mail, 
  Users,
  CheckCircle2,
  Clock,
  MailOpen,
} from 'lucide-react';
import { format } from 'date-fns';

interface Recipient {
  id: string;
  display_name: string | null;
  email: string | null;
  type: 'creator' | 'cmo' | 'headops';
}

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  recipient_id: string;
  recipient_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient_name?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [recipientType, setRecipientType] = useState<string>('individual');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch creators
    const { data: creatorsData } = await supabase
      .from('creator_profiles')
      .select('id, display_name, user_id')
      .eq('is_active', true);

    // Fetch CMOs
    const { data: cmosData } = await supabase
      .from('cmo_profiles')
      .select('id, display_name, user_id, is_head_ops')
      .eq('is_active', true);

    // Get profiles for email
    const allUserIds = [
      ...(creatorsData || []).map(c => c.user_id),
      ...(cmosData || []).map(c => c.user_id),
    ];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, email')
      .in('user_id', allUserIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p.email]));

    // Build recipient list
    const allRecipients: Recipient[] = [
      ...(creatorsData || []).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id) || null,
        type: 'creator' as const,
      })),
      ...(cmosData || []).filter(c => !c.is_head_ops).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id) || null,
        type: 'cmo' as const,
      })),
      ...(cmosData || []).filter(c => c.is_head_ops).map(c => ({
        id: c.user_id,
        display_name: c.display_name,
        email: profileMap.get(c.user_id) || null,
        type: 'headops' as const,
      })),
    ];

    setRecipients(allRecipients);

    // Fetch sent messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Add recipient names
    const messagesWithNames = (messagesData || []).map(m => {
      const recipient = allRecipients.find(r => r.id === m.recipient_id);
      return {
        ...m,
        recipient_name: recipient?.display_name || recipient?.email || 'Unknown',
      };
    });

    setSentMessages(messagesWithNames);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (recipientType === 'individual' && !selectedRecipient) {
      toast.error('Please select a recipient');
      return;
    }

    setIsSending(true);

    try {
      let messagesToInsert: any[] = [];

      if (recipientType === 'individual') {
        const recipient = recipients.find(r => r.id === selectedRecipient);
        messagesToInsert.push({
          sender_id: user?.id,
          recipient_id: selectedRecipient,
          recipient_type: recipient?.type || 'creator',
          subject,
          body,
        });
      } else {
        // Send to all of a type
        const targetRecipients = recipients.filter(r => {
          if (recipientType === 'all_creators') return r.type === 'creator';
          if (recipientType === 'all_cmos') return r.type === 'cmo';
          if (recipientType === 'all_headops') return r.type === 'headops';
          return false;
        });

        messagesToInsert = targetRecipients.map(r => ({
          sender_id: user?.id,
          recipient_id: r.id,
          recipient_type: r.type,
          subject,
          body,
        }));
      }

      if (messagesToInsert.length === 0) {
        toast.error('No recipients found');
        setIsSending(false);
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (error) throw error;

      toast.success(`Message sent to ${messagesToInsert.length} recipient(s)`);
      setSubject('');
      setBody('');
      setSelectedRecipient('');
      fetchData();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }

    setIsSending(false);
  };

  const filteredRecipients = recipients.filter(r => {
    if (recipientType === 'individual') return true;
    return false;
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-sm">Send messages to creators, CMOs, and Head of Ops</p>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="sent">Sent Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <div className="glass-card p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                New Message
              </h2>

              <div className="space-y-4">
                {/* Recipient Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Send To</Label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="all_creators">All Creators ({recipients.filter(r => r.type === 'creator').length})</SelectItem>
                      <SelectItem value="all_cmos">All CMOs ({recipients.filter(r => r.type === 'cmo').length})</SelectItem>
                      <SelectItem value="all_headops">All Head of Ops ({recipients.filter(r => r.type === 'headops').length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Individual Recipient */}
                {recipientType === 'individual' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Recipient</Label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {recipients.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No recipients found</div>
                        ) : (
                          recipients.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {r.type === 'headops' ? 'HOO' : r.type.toUpperCase()}
                                </Badge>
                                {r.display_name || r.email || 'Unknown'}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Subject</Label>
                  <Input
                    placeholder="Message subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Body */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Message</Label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button
                  variant="brand"
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full"
                >
                  {isSending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sent">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sent Messages ({sentMessages.length})
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No messages sent yet</div>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{message.subject}</p>
                            {message.is_read ? (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                                <MailOpen className="w-3 h-3 mr-1" />
                                Read
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Unread
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            To: {message.recipient_name}
                          </p>
                          <p className="text-sm text-muted-foreground/80 line-clamp-2">
                            {message.body}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{format(new Date(message.created_at), 'MMM d, yyyy')}</p>
                          <p>{format(new Date(message.created_at), 'h:mm a')}</p>
                          {message.read_at && (
                            <p className="text-green-400 mt-1">
                              Read {format(new Date(message.read_at), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Messages;
