
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export type MessageWithProfile = Message & {
  sender_profile?: Profile;
  receiver_profile?: Profile;
};

export function useMessages() {
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [conversations, setConversations] = useState<Record<string, MessageWithProfile[]>>({});
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all messages where current user is either sender or receiver
      const { data, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!sender_id(*),
          receiver_profile:profiles!receiver_id(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (messagesError) throw messagesError;
      
      // Group messages by conversation
      const newMessages = data as MessageWithProfile[];
      setMessages(newMessages);
      
      // Count unread messages where current user is the receiver
      const unread = newMessages.filter(msg => 
        msg.receiver_id === user.id && msg.read === false
      );
      
      setUnreadCount(unread.length);
      
      // Group by conversations
      const convos: Record<string, MessageWithProfile[]> = {};
      newMessages.forEach(msg => {
        // Determine the other party in conversation
        const otherParty = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convos[otherParty]) {
          convos[otherParty] = [];
        }
        convos[otherParty].push(msg);
      });
      
      // Sort each conversation's messages by date
      Object.keys(convos).forEach(key => {
        convos[key].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      setConversations(convos);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('receiver_id', user?.id);
      
      if (error) throw error;
      
      // Update local state to reflect change
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? {...msg, read: true} : msg
        )
      );
      
      // Recalculate unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }, [user]);

  const markConversationAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return;
    try {
      // Update all messages in the conversation where current user is receiver
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          (msg.sender_id === otherUserId && msg.receiver_id === user.id) 
            ? {...msg, read: true} 
            : msg
        )
      );
      
      // Update conversations state
      setConversations(prevConvos => {
        const updatedConvo = prevConvos[otherUserId]?.map(msg => 
          (msg.sender_id === otherUserId && msg.receiver_id === user.id) 
            ? {...msg, read: true} 
            : msg
        );
        
        return {
          ...prevConvos,
          [otherUserId]: updatedConvo || []
        };
      });
      
      // Recalculate unread count
      fetchMessages();
      
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  }, [user, fetchMessages]);

  const sendMessage = useCallback(async (
    receiverId: string, 
    content: string, 
    listingId?: string, 
    lostFoundId?: string
  ) => {
    if (!user) return null;
    
    try {
      const newMessage = {
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        listing_id: listingId || null,
        lost_found_id: lostFoundId || null,
        read: false
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Manually update local state with the new message
      const { data: senderData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const { data: receiverData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', receiverId)
        .single();
      
      const newMessageWithProfiles: MessageWithProfile = {
        ...data,
        sender_profile: senderData as Profile,
        receiver_profile: receiverData as Profile
      };
      
      // Add to messages array
      setMessages(prev => [newMessageWithProfiles, ...prev]);
      
      // Add to conversation
      setConversations(prev => {
        const existingConvo = prev[receiverId] || [];
        return {
          ...prev,
          [receiverId]: [...existingConvo, newMessageWithProfiles]
        };
      });
      
      return data;
    } catch (err: any) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: user ? `receiver_id=eq.${user.id}` : undefined
      }, async payload => {
        console.log('New message received:', payload);
        // When a new message is inserted, fetch updated data
        fetchMessages();
      })
      .subscribe();
    
    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, fetchMessages]);

  return {
    messages,
    conversations,
    unreadCount,
    loading,
    error,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    refetch: fetchMessages
  };
}
