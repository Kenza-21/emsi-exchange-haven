
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Friend, Profile } from '@/types/database';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

interface FriendWithProfiles extends Friend {
  profile?: Profile | null;
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch friends list
  const { 
    data: friends,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      if (!userId) {
        toast({
          title: "Error",
          description: "You must be logged in to view friends",
          variant: "destructive"
        });
        return { sent: [], received: [], connected: [] };
      }

      try {
        // Get friend requests sent by the user
        const { data: sentRequests, error: sentError } = await supabase
          .from('friends')
          .select(`
            *,
            profile:profiles!friends_receiver_id_fkey(*)
          `)
          .eq('sender_id', userId)
          .order('created_at', { ascending: false });

        if (sentError) throw sentError;
        
        // Get friend requests received by the user
        const { data: receivedRequests, error: receivedError } = await supabase
          .from('friends')
          .select(`
            *,
            profile:profiles!friends_sender_id_fkey(*)
          `)
          .eq('receiver_id', userId)
          .order('created_at', { ascending: false });
          
        if (receivedError) throw receivedError;
        
        // Process data into appropriate categories
        const connected: FriendWithProfiles[] = [];
        const sent: FriendWithProfiles[] = [];
        const received: FriendWithProfiles[] = [];
        
        sentRequests?.forEach(request => {
          if (request.status === 'accepted') {
            connected.push(request as FriendWithProfiles);
          } else {
            sent.push(request as FriendWithProfiles);
          }
        });
        
        receivedRequests?.forEach(request => {
          if (request.status === 'accepted') {
            connected.push(request as FriendWithProfiles);
          } else {
            received.push(request as FriendWithProfiles);
          }
        });
        
        return { sent, received, connected };
      } catch (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }
    },
    enabled: !!userId
  });

  // Send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!userId) throw new Error('You must be logged in to send friend requests');
      if (userId === receiverId) throw new Error('You cannot send a friend request to yourself');
      
      // Check if request already exists
      const { data: existingRequests, error: checkError } = await supabase
        .from('friends')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
        .single();
        
      if (checkError && !checkError.message.includes('No rows found')) {
        throw checkError;
      }
      
      if (existingRequests) {
        throw new Error('A friend request already exists between you and this user');
      }
      
      const { data, error } = await supabase
        .from('friends')
        .insert([
          { sender_id: userId, receiver_id: receiverId }
        ]);
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['profileSummary'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive"
      });
    }
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('receiver_id', userId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, requestId) => {
      const request = friends?.received.find(req => req.id === requestId);
      toast({
        title: "Friend request accepted",
        description: `You are now friends with ${request?.profile?.full_name ?? 'this user'}.`
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['profileSummary'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  });

  // Reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('receiver_id', userId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, requestId) => {
      const request = friends?.received.find(req => req.id === requestId);
      toast({
        title: "Friend request rejected",
        description: `You have rejected ${request?.profile?.full_name ?? 'this user'}'s friend request.`
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive"
      });
    }
  });

  // Cancel friend request
  const cancelFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', userId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Request canceled",
        description: "Your friend request has been canceled."
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive"
      });
    }
  });

  // Unfriend
  const unfriend = useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Unfriended",
        description: "You have removed this user from your friends."
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['profileSummary'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfriend",
        variant: "destructive"
      });
    }
  });

  // Search users
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !userId) return;
    
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .ilike('full_name', `%${query}%`)
        .limit(10);
        
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return {
    friends,
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching,
    refetch
  };
}
