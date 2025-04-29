
import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Message, Profile, Friend } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useFriends } from '@/hooks/useFriends';

interface ConversationPartner extends Profile {
  lastMessage?: Message;
  isFriend?: boolean;
}

interface ItemContext {
  type: 'listing' | 'lostfound';
  id: string;
  title: string;
}

export function MessagesList() {
  const { user } = useAuth();
  const location = useLocation();
  const { friends } = useFriends();
  const [conversations, setConversations] = useState<ConversationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [itemContext, setItemContext] = useState<ItemContext | null>(null);

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
  useEffect(() => {
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
        
        // Add last message to each partner and check if they are friends
        const conversationsWithLastMessage = partnersData.map((partner: Profile) => {
          const lastMessage = messagesData?.find((msg: Message) => 
            msg.sender_id === partner.id || msg.receiver_id === partner.id
          );
          
          const isFriend = friends.some(f => 
            (f.sender_id === partner.id && f.receiver_id === user.id) || 
            (f.receiver_id === partner.id && f.sender_id === user.id)
          );
          
          return { ...partner, lastMessage, isFriend };
        });
        
        setConversations(conversationsWithLastMessage);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, friends]);

  // Fetch messages for selected conversation
  useEffect(() => {
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
        
        // Mark messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .match({ sender_id: selectedUser, receiver_id: user.id, read: false });
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    if (selectedUser) {
      fetchMessages();
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `or(and(sender_id=eq.${user?.id},receiver_id=eq.${selectedUser}),and(sender_id=eq.${selectedUser},receiver_id=eq.${user?.id}))`
        }, payload => {
          setMessages(prevMessages => [...prevMessages, payload.new as Message]);
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
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
        // Clear item context after first message
        setItemContext(null);
      }
      
      const { error } = await supabase
        .from('messages')
        .insert([messageData]);
        
      if (error) throw error;
      
      setNewMessage('');
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
        
        await supabase.from('messages').insert([messageData]);
        
        // Clear context to avoid sending duplicates
        setItemContext(null);
      } catch (error) {
        console.error('Error sending first message:', error);
      }
    };
    
    // Only attempt to send first message when we have conversations loaded and selected user
    if (conversations.length > 0 && selectedUser && itemContext) {
      sendFirstMessageWithContext();
    }
  }, [conversations, selectedUser, itemContext, user]);

  // Get unread messages count for conversations
  const getUnreadCount = (partnerId: string) => {
    if (!user) return 0;
    
    return conversations
      .find(conv => conv.id === partnerId)?.lastMessage?.read === false && 
      conversations.find(conv => conv.id === partnerId)?.lastMessage?.sender_id === partnerId 
      ? 1 
      : 0;
  };

  return (
    <div className="h-[calc(100vh-7rem)] grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversations List */}
      <div className="border rounded-lg overflow-hidden bg-white">
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
            conversations.map(partner => {
              const unreadCount = getUnreadCount(partner.id);
              
              return (
                <div 
                  key={partner.id} 
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedUser === partner.id ? 'bg-emerald-50' : ''
                  } ${unreadCount > 0 ? 'bg-emerald-50/50' : ''}`}
                  onClick={() => setSelectedUser(partner.id)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center relative">
                      {partner.full_name?.[0] || '?'}
                      {partner.isFriend && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <p className={`font-medium text-gray-800 ${unreadCount > 0 ? 'font-bold' : ''}`}>
                          {partner.full_name}
                        </p>
                        {unreadCount > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {partner.lastMessage && (
                        <p className={`text-sm text-gray-500 truncate ${unreadCount > 0 ? 'font-medium' : ''}`}>
                          {partner.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {partner.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {partner.lastMessage && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDistanceToNow(new Date(partner.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="border rounded-lg overflow-hidden bg-white md:col-span-2">
        {!selectedUser ? (
          <div className="flex flex-col justify-center items-center h-full text-gray-500">
            <p>Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">
                {conversations.find(c => c.id === selectedUser)?.full_name}
              </h2>
            </div>
            
            {/* Messages */}
            <div className="p-4 overflow-y-auto h-[calc(100%-8rem)]">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-20">
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  No messages yet
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Check if this message has item context
                    const hasListingContext = message.listing_id !== null;
                    const hasLostFoundContext = message.lost_found_id !== null;
                    const isFirstMessageWithContext = index === 0 && (hasListingContext || hasLostFoundContext);
                    
                    return (
                      <div key={message.id}>
                        {isFirstMessageWithContext && (
                          <div className="flex justify-center my-4">
                            <div className="bg-gray-100 rounded-lg py-2 px-4 text-sm text-center">
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
                          className={`mb-4 flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`py-2 px-4 rounded-lg max-w-[80%] ${
                              message.sender_id === user?.id 
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className="text-xs opacity-70 text-right mt-1">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={sendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 border rounded-l-lg py-2 px-4"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-r-lg"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
