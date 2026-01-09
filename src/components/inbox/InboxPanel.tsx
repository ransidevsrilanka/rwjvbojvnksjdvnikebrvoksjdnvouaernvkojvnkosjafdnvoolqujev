import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface InboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMessagesRead: () => void;
}

const InboxPanel = ({ isOpen, onClose, onMessagesRead }: InboxPanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
    }
  }, [isOpen, user]);

  const fetchMessages = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setMessages(data || []);
    setIsLoading(false);
  };

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);

    // Mark as read if unread
    if (!message.is_read) {
      await supabase
        .from('messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', message.id);

      // Update local state
      setMessages(prev => 
        prev.map(m => 
          m.id === message.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
        )
      );

      // Notify parent to update count
      onMessagesRead();
    }
  };

  const handleBack = () => {
    setSelectedMessage(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {selectedMessage ? (
              <button 
                onClick={handleBack}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Inbox
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading messages...</div>
            </div>
          ) : selectedMessage ? (
            // Message Detail View
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedMessage.subject}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(selectedMessage.created_at), 'PPp')}
                </div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selectedMessage.body}
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MailOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Messages from admin will appear here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-2 pr-4">
                {messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      message.is_read 
                        ? 'bg-secondary/30 hover:bg-secondary/50' 
                        : 'bg-brand/10 border border-brand/30 hover:bg-brand/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.is_read ? 'bg-muted' : 'bg-brand/20'
                      }`}>
                        {message.is_read ? (
                          <MailOpen className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Mail className="w-4 h-4 text-brand" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${
                            message.is_read ? 'text-foreground' : 'text-foreground'
                          }`}>
                            {message.subject}
                          </p>
                          {!message.is_read && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {message.body.substring(0, 50)}...
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InboxPanel;
