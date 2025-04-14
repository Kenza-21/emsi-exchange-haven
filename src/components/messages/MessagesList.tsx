
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Message, Profile } from '@/types/database';

interface ConversationPartner extends Profile {
  lastMessage?: Message;
}

export function MessagesList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

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
        
        // Add last message to each partner
        const conversationsWithLastMessage = partnersData.map((partner: Profile) => {
          const lastMessage = messagesData?.find((msg: Message) => 
            msg.sender_id === partner.id || msg.receiver_id === partner.id
          );
          return { ...partner, lastMessage };
        });
        
        setConversations(conversationsWithLastMessage);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

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
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: selectedUser,
          content: newMessage.trim(),
          read: false,
          listing_id: null  // Could be linked to a listing in the future
        }]);
        
      if (error) throw error;
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
            conversations.map(partner => (
              <div 
                key={partner.id} 
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedUser === partner.id ? 'bg-emerald-50' : ''
                }`}
                onClick={() => setSelectedUser(partner.id)}
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    {partner.full_name?.[0] || '?'}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{partner.full_name}</p>
                    {partner.lastMessage && (
                      <p className="text-sm text-gray-500 truncate">
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
            ))
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
                messages.map(message => (
                  <div 
                    key={message.id} 
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
                ))
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
