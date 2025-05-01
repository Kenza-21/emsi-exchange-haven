
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Friend, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface FriendWithProfile extends Friend {
  profile?: Profile | null;
}

export function useFriends() {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Function to send a friend request
  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully."
      });
      
      // Refresh the friends list
      fetchFriends();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request: " + error.message,
        variant: "destructive"
      });
    }
  };

  // Function to fetch friends and pending requests
  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get friends where user is the sender
      const { data: sentFriends, error: sentError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_receiver_id_fkey(id, full_name, student_id, created_at)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'accepted');
        
      if (sentError) throw sentError;
      
      // Get friends where user is the receiver
      const { data: receivedFriends, error: receivedError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_sender_id_fkey(id, full_name, student_id, created_at)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'accepted');
        
      if (receivedError) throw receivedError;
      
      // Get pending friend requests received by the user
      const { data: pendingFriendRequests, error: pendingError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_sender_id_fkey(id, full_name, student_id, created_at)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
        
      if (pendingError) throw pendingError;
      
      // Safely process and transform the data
      const processedSentFriends = sentFriends?.map(friend => {
        return {
          ...friend,
          profile: friend.profile && typeof friend.profile === 'object' && !('error' in friend.profile)
            ? friend.profile as Profile
            : null
        } as FriendWithProfile;
      }) || [];
      
      const processedReceivedFriends = receivedFriends?.map(friend => {
        return {
          ...friend,
          profile: friend.profile && typeof friend.profile === 'object' && !('error' in friend.profile)
            ? friend.profile as Profile
            : null
        } as FriendWithProfile;
      }) || [];
      
      const processedPendingRequests = pendingFriendRequests?.map(friend => {
        return {
          ...friend,
          profile: friend.profile && typeof friend.profile === 'object' && !('error' in friend.profile)
            ? friend.profile as Profile
            : null
        } as FriendWithProfile;
      }) || [];
      
      setFriends([...processedSentFriends, ...processedReceivedFriends]);
      setPendingRequests(processedPendingRequests);
      
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to respond to a friend request
  const respondToFriendRequest = async (friendId: string, accept: boolean) => {
    try {
      if (accept) {
        // Accept the friend request
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', friendId);
        
        if (error) throw error;
        
        toast({
          title: "Friend request accepted",
          description: "You are now friends!"
        });
      } else {
        // Reject the friend request
        const { error } = await supabase
          .from('friends')
          .update({ status: 'rejected' })
          .eq('id', friendId);
        
        if (error) throw error;
        
        toast({
          title: "Friend request rejected",
          description: "The friend request has been rejected."
        });
      }
      
      // Refresh the friends list
      fetchFriends();
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to friend request: " + error.message,
        variant: "destructive"
      });
    }
  };

  // Fetch friends when the user changes
  useEffect(() => {
    if (user) {
      fetchFriends();
    } else {
      setFriends([]);
      setPendingRequests([]);
    }
  }, [user]);

  return {
    friends,
    pendingRequests,
    loading,
    error,
    sendFriendRequest,
    respondToFriendRequest,
    refreshFriends: fetchFriends
  };
}
