
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Friend, Profile, FriendWithProfiles } from '@/types/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export function useFriends() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();
  
  // Define the query for fetching friends
  const fetchFriends = async () => {
    if (!user) {
      return { sent: [], received: [], connected: [] };
    }
    
    try {
      // Fetch sent friend requests with profile info of receiver
      const { data: sentRequests, error: sentError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_receiver_id_fkey(*)
        `)
        .eq('sender_id', user.id);
      
      if (sentError) throw sentError;
      
      // Fetch received friend requests with profile info of sender
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_sender_id_fkey(*)
        `)
        .eq('receiver_id', user.id);
      
      if (receivedError) throw receivedError;
      
      // Process the results
      const sentFriends: FriendWithProfiles[] = [];
      const receivedFriends: FriendWithProfiles[] = [];
      const connectedFriends: FriendWithProfiles[] = [];
      
      // Process sent requests
      sentRequests.forEach((request: any) => {
        const friend: FriendWithProfiles = {
          ...request,
          profile: request.profile as Profile | null
        };
        
        if (friend.status === 'accepted') {
          connectedFriends.push(friend);
        } else {
          sentFriends.push(friend);
        }
      });
      
      // Process received requests
      receivedRequests.forEach((request: any) => {
        const friend: FriendWithProfiles = {
          ...request,
          profile: request.profile as Profile | null
        };
        
        if (friend.status === 'accepted') {
          // Avoid duplicates if already added from sent requests
          if (!connectedFriends.some(f => f.id === friend.id)) {
            connectedFriends.push(friend);
          }
        } else {
          receivedFriends.push(friend);
        }
      });
      
      return {
        sent: sentFriends,
        received: receivedFriends,
        connected: connectedFriends
      };
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: fetchFriends,
    enabled: !!user,
    initialData: { sent: [], received: [], connected: [] }
  });

  // Function to check if a user is a friend
  const checkFriendStatus = useCallback((userId: string) => {
    if (!data) return null;
    
    // Check in connected friends
    const connectedFriend = data.connected.find(
      f => f.sender_id === userId || f.receiver_id === userId
    );
    if (connectedFriend) return 'connected';
    
    // Check in sent friend requests
    const sentRequest = data.sent.find(f => f.receiver_id === userId);
    if (sentRequest) return 'sent';
    
    // Check in received friend requests
    const receivedRequest = data.received.find(f => f.sender_id === userId);
    if (receivedRequest) return 'received';
    
    // Not a friend
    return null;
  }, [data]);

  // Function to send a friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('friends')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    }
  });

  // Function to accept a friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('receiver_id', user.id); // Ensure the current user is the receiver
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    }
  });

  // Function to reject a friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('receiver_id', user.id); // Ensure the current user is the receiver
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    }
  });

  // Function to cancel a friend request
  const cancelFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user.id); // Ensure the current user is the sender
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    }
  });

  // Function to unfriend
  const unfriend = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`); // User must be either sender or receiver
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    }
  });

  // Function to search users
  const searchUsers = async (query: string) => {
    if (!user || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .neq('id', user.id) // Don't include current user
        .limit(20);
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    friends: data || { sent: [], received: [], connected: [] },
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    checkFriendStatus,
    refetch,
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching
  };
}
