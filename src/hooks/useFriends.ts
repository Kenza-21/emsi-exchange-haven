
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Friend, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

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
    if (!user) return { success: false };

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
      return { success: true };
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request: " + error.message,
        variant: "destructive"
      });
      return { success: false };
    }
  };

  // Function to check friend status
  const checkFriendStatus = async (otherUserId: string) => {
    if (!user) return null;
    
    try {
      // Check if there's an existing friend relationship
      const { data: sentRequest, error: sentError } = await supabase
        .from('friends')
        .select('*')
        .eq('sender_id', user.id)
        .eq('receiver_id', otherUserId)
        .single();
        
      if (sentError && sentError.code !== 'PGRST116') {
        throw sentError;
      }
      
      const { data: receivedRequest, error: receivedError } = await supabase
        .from('friends')
        .select('*')
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .single();
        
      if (receivedError && receivedError.code !== 'PGRST116') {
        throw receivedError;
      }
      
      if (sentRequest) {
        return {
          exists: true,
          status: sentRequest.status,
          isReceiver: false
        };
      }
      
      if (receivedRequest) {
        return {
          exists: true,
          status: receivedRequest.status,
          isReceiver: true
        };
      }
      
      return { exists: false };
    } catch (error: any) {
      console.error('Error checking friend status:', error);
      return { exists: false, error: error.message };
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

  // Function to remove a friend
  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);
        
      if (error) throw error;
      
      toast({
        title: "Friend removed",
        description: "The friend has been removed from your friends list."
      });
      
      // Refresh the friends list
      fetchFriends();
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast({
        title: "Error",
        description: "Failed to remove friend: " + error.message,
        variant: "destructive"
      });
    }
  };

  // Add alias functions to match FriendsPage expectations
  const acceptFriendRequest = (friendId: string) => respondToFriendRequest(friendId, true);
  const rejectFriendRequest = (friendId: string) => respondToFriendRequest(friendId, false);

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
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    checkFriendStatus,
    refreshFriends: fetchFriends
  };
}
