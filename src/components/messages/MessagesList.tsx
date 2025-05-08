import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { Message, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ExternalLink, Send, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages } from '@/hooks/useMessages';

interface ConversationPartner extends Profile {
  lastMessage?: Message;
  unreadCount: number;
}

interface ItemContext {
  type: 'listing' | 'lostfound';
  id: string;
  title: string;
}

export function MessagesList() {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadCount: totalUnreadCount, markConversationAsRead } = useMessages();
  const [conversations, setConversations] = useState<ConversationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [itemContext, setItemContext] = useState<ItemContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if there's a user to contact from navigation state
  useEffect(() => {
    if (location.state?.contactUserId) {
      setSelectedUser(location.state.contactUserId);
    }
    
    if (location.state?.itemContext) {
      setItemContext(location.state.itemContext);
    }
  }, [location.state]);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Get all messages where the user is either sender or receiver
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (messagesError) throw messagesError;
      
      // Get unique conversation partners
      const conversationPartnerIds = new Set<string>();
      messagesData?.forEach((message: Message) => {
        if (message.sender_id === user.id) {
          conversationPartnerIds.add(message.receiver_id);
        } else {
          conversationPartnerIds.add(message.sender_id);
        }
      });
      
      // Get profiles of conversation partners
      const partnerIds = Array.from(conversationPartnerIds);
      if (partnerIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }
      
      const { data: partnersData, error: partnersError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', partnerIds);
          
      if (partnersError) throw partnersError;
      
      // Add last message to each partner and count unread messages
      const conversationsWithLastMessage = partnersData.map((partner: Profile) => {
        // Get all messages with this partner
        const conversationMessages = messagesData?.filter((msg: Message) => 
          (msg.sender_id === partner.id && msg.receiver_id === user.id) || 
          (msg.sender_id === user.id && msg.receiver_id === partner.id)
        ) || [];
        
        // Sort by created_at to get the latest message
        conversationMessages.sort((a: Message, b: Message) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const lastMessage = conversationMessages[0];
        
        // Count unread messages
        const unreadCount = conversationMessages.filter(
          (msg: Message) => msg.sender_id === partner.id && msg.receiver_id === user.id && !msg.read
        ).length;
        
        return { 
          ...partner, 
          lastMessage, 
          unreadCount
        };
      });
      
      // Sort conversations by latest message first
      conversationsWithLastMessage.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });
      
      setConversations(conversationsWithLastMessage);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `or(sender_id=eq.${user?.id},receiver_id=eq.${user?.id})`
      }, () => {
        // Refresh conversations when any message changes
        fetchConversations();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Fetch messages for selected conversation and mark as read
  const fetchMessages = async () => {
    if (!user || !selectedUser) return;
    
    setLoadingMessages(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
          
      if (error) throw error;
      
      setMessages(data as Message[]);
      
      // Mark messages as read automatically when conversation is opened
      await markConversationAsRead(selectedUser);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [user, selectedUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !newMessage.trim()) return;
    
    try {
      // Create message data with item context if available
      const messageData: any = {
        sender_id: user.id,
        receiver_id: selectedUser,
        content: newMessage.trim(),
        read: false
      };
      
      // Add item reference if we have context
      if (itemContext) {
        if (itemContext.type === 'listing') {
          messageData.listing_id = itemContext.id;
        } else if (itemContext.type === 'lostfound') {
          messageData.lost_found_id = itemContext.id;
        }
      }
      
      // First add the message locally for instant UI update
      const optimisticMessage: Message = {
        ...messageData,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Clear the input field immediately
      setNewMessage('');
      
      // Now send to the server
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();
        
      if (error) throw error;
      
      // Replace the optimistic message with the real one
      setMessages(prev => 
        prev.map(msg => msg.id === optimisticMessage.id ? data : msg)
      );
      
      // Clear item context after first message
      if (itemContext) setItemContext(null);
      
      // Refresh conversations list
      fetchConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  // If context is available, add an automated first message
  useEffect(() => {
    const sendFirstMessageWithContext = async () => {
      if (!user || !selectedUser || !itemContext) return;
      
      // Only send if this is a new conversation or we have context
      const existingConversation = conversations.some(conv => conv.id === selectedUser);
      
      if (existingConversation) return;
      
      try {
        let contextMessage = "";
        let itemId = null;
        let itemType = null;
        
        if (itemContext.type === 'listing') {
          contextMessage = `Hi, I'm interested in your listing: "${itemContext.title}"`;
          itemId = itemContext.id;
          itemType = 'listing';
        } else if (itemContext.type === 'lostfound') {
          contextMessage = `Hi, I'm contacting you about your lost & found item: "${itemContext.title}"`;
          itemId = itemContext.id;
          itemType = 'lostfound';
        }
        
        if (!contextMessage) return;
        
        // Add optimistic first message
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender_id: user.id,
          receiver_id: selectedUser,
          content: contextMessage,
          read: false,
          created_at: new Date().toISOString(),
          listing_id: itemType === 'listing' ? itemId : null,
          lost_found_id: itemType === 'lostfound' ? itemId : null
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Now send to the server
        const messageData: any = {
          sender_id: user.id,
          receiver_id: selectedUser,
          content: contextMessage,
          read: false
        };
        
        // Add item reference 
        if (itemType === 'listing') {
          messageData.listing_id = itemId;
        } else if (itemType === 'lostfound') {
          messageData.lost_found_id = itemId;
        }
        
        const { data, error } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single();
          
        if (error) throw error;
        
        // Replace the optimistic message with the real one
        setMessages(prev => 
          prev.map(msg => msg.id === optimisticMessage.id ? data : msg)
        );
        
        // Clear context to avoid sending duplicates
        setItemContext(null);
        
        // Refresh conversations list
        fetchConversations();
      } catch (error) {
        console.error('Error sending first message:', error);
      }
    };
    
    // Only attempt to send first message when we have conversations loaded and selected user
    if (conversations.length > 0 && selectedUser && itemContext) {
      sendFirstMessageWithContext();
    }
  }, [conversations, selectedUser, itemContext, user]);

  // Format time for messages
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return format(date, 'h:mm a'); // Today: just show time
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday ' + format(date, 'h:mm a'); // Yesterday
    } else {
      return format(date, 'MMM d, h:mm a'); // Other days
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversations List */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Conversations</h2>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span>Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            conversations.map(partner => (
              <div 
                key={partner.id} 
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedUser === partner.id ? 'bg-emerald-50' : ''
                } ${partner.unreadCount > 0 ? 'bg-emerald-50/50' : ''}`}
                onClick={() => setSelectedUser(partner.id)}
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium relative">
                    {partner.full_name?.[0] || '?'}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium text-gray-800 truncate ${partner.unreadCount > 0 ? 'font-bold' : ''}`}>
                        {partner.full_name}
                      </p>
                      {partner.lastMessage && (
                        <span className="text-xs text-gray-400 ml-2 shrink-0">
                          {formatDistanceToNow(new Date(partner.lastMessage.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      {partner.lastMessage && (
                        <p className={`text-sm text-gray-500 truncate ${partner.unreadCount > 0 ? 'font-medium' : ''}`}>
                          {partner.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {partner.lastMessage.content}
                        </p>
                      )}
                      {partner.unreadCount > 0 && (
                        <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                          {partner.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm md:col-span-2 flex flex-col">
        {!selectedUser ? (
          <div className="flex flex-col justify-center items-center h-full text-gray-500 p-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-center">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex items-center">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium mr-3">
                {conversations.find(c => c.id === selectedUser)?.full_name?.[0] || '?'}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">
                  {conversations.find(c => c.id === selectedUser)?.full_name}
                </h2>
                <p className="text-xs text-gray-500">EMSI Student</p>
              </div>
            </div>
            
            {/* Messages */}
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-20">
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 my-8">
                  <p>No messages yet</p>
                  <p className="text-sm mt-2">Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Check if this message has item context
                    const hasListingContext = message.listing_id !== null;
                    const hasLostFoundContext = message.lost_found_id !== null;
                    const isFirstMessageWithContext = index === 0 && (hasListingContext || hasLostFoundContext);
                    const isCurrentUser = message.sender_id === user?.id;
                    const showDateHeader = index === 0 || 
                      new Date(messages[index-1].created_at).toDateString() !== new Date(message.created_at).toDateString();
                    
                    return (
                      <div key={message.id}>
                        {showDateHeader && (
                          <div className="flex justify-center my-4">
                            <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                              {format(new Date(message.created_at), 'EEEE, MMMM d')}
                            </div>
                          </div>
                        )}
                        
                        {isFirstMessageWithContext && (
                          <div className="flex justify-center my-4">
                            <div className="bg-white rounded-lg py-2 px-4 text-sm text-center shadow-sm border border-gray-100">
                              <p className="text-gray-500 mb-2">
                                {hasListingContext ? 'Conversation about listing' : 'Conversation about lost & found item'}
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                className="text-xs"
                              >
                                <Link to={hasListingContext ? `/listing/${message.listing_id}` : `/lost-found/${message.lost_found_id}`}>
                                  View Item <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div 
                          className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`py-2 px-4 rounded-lg max-w-[80%] shadow-sm ${
                              isCurrentUser 
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs ${isCurrentUser ? 'text-emerald-100' : 'text-gray-400'} text-right mt-1`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={sendMessage} className="flex items-end">
                <Textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 border rounded-lg py-2 px-4 resize-none"
                  placeholder="Type a message..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  className="ml-2 bg-emerald-600 text-white p-2 h-10 w-10 flex items-center justify-center rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
