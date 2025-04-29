
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Friend, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface FriendWithProfile extends Friend {
  profile?: Profile;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get accepted friends where user is sender
        const { data: sentFriends, error: sentError } = await supabase
          .from('friends')
          .select(`
            *,
            profile:profiles!receiver_id(*)
          `)
          .eq('sender_id', user.id)
          .eq('status', 'accepted');
        
        if (sentError) throw sentError;
        
        // Get accepted friends where user is receiver
        const { data: receivedFriends, error: receivedError } = await supabase
          .from('friends')
          .select(`
            *,
            profile:profiles!sender_id(*)
          `)
          .eq('receiver_id', user.id)
          .eq('status', 'accepted');
          
        if (receivedError) throw receivedError;
        
        // Get pending friend requests sent to the user
        const { data: pendingFriendRequests, error: pendingError } = await supabase
          .from('friends')
          .select(`
            *,
            profile:profiles!sender_id(*)
          `)
          .eq('receiver_id', user.id)
          .eq('status', 'pending');
          
        if (pendingError) throw pendingError;
        
        setFriends([...sentFriends, ...receivedFriends] as FriendWithProfile[]);
        setPendingRequests(pendingFriendRequests as FriendWithProfile[]);
      } catch (err: any) {
        console.error('Error fetching friends:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('friends-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `sender_id=eq.${user.id}`,
      }, () => {
        fetchFriends();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        fetchFriends();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send a friend request",
        variant: "destructive"
      });
      return { error: "Not authenticated" };
    }
    
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
        title: "Success",
        description: "Friend request sent",
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      
      toast({
        title: "Error",
        description: err.message || "Failed to send friend request",
        variant: "destructive"
      });
      
      return { error: err.message };
    }
  };

  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return { error: "Not authenticated" };
    
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId)
        .eq('receiver_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Friend request accepted",
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
      
      toast({
        title: "Error",
        description: err.message || "Failed to accept friend request",
        variant: "destructive"
      });
      
      return { error: err.message };
    }
  };

  const rejectFriendRequest = async (friendId: string) => {
    if (!user) return { error: "Not authenticated" };
    
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', friendId)
        .eq('receiver_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Friend request rejected",
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting friend request:', err);
      
      toast({
        title: "Error",
        description: err.message || "Failed to reject friend request",
        variant: "destructive"
      });
      
      return { error: err.message };
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return { error: "Not authenticated" };
    
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Friend removed",
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Error removing friend:', err);
      
      toast({
        title: "Error",
        description: err.message || "Failed to remove friend",
        variant: "destructive"
      });
      
      return { error: err.message };
    }
  };

  return { 
    friends, 
    pendingRequests, 
    loading, 
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  };
}
