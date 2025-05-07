
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type FriendStatus = 'connected' | 'sent' | 'received' | null;

// Define types for our friend requests based on the database schema
interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    student_id?: string;
  }
}

interface FriendGroups {
  connected: FriendRequest[];
  sent: FriendRequest[];
  received: FriendRequest[];
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Query to fetch user's friend connections
  const { 
    data: friendRequests = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get friend requests where the current user is the sender
      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select('*, profile:profiles!to_user_id(*)')
        .eq('from_user_id', user.id);

      // Get friend requests where the current user is the receiver
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*, profile:profiles!from_user_id(*)')
        .eq('to_user_id', user.id);

      if (sentError || receivedError) {
        console.error('Error fetching friend requests:', sentError || receivedError);
        return [];
      }

      return [...(sentRequests || []), ...(receivedRequests || [])];
    },
    enabled: !!user,
  });

  // Organize friend requests into groups
  const friends: FriendGroups = {
    connected: [],
    sent: [],
    received: [],
  };

  // Process friend requests into appropriate categories
  if (friendRequests.length > 0) {
    friendRequests.forEach((request: FriendRequest) => {
      if (request.status === 'accepted') {
        friends.connected.push(request);
      } else if (request.status === 'pending') {
        if (request.from_user_id === user?.id) {
          friends.sent.push(request);
        } else {
          friends.received.push(request);
        }
      }
    });
  }

  // Function to check friend status with another user
  const checkFriendStatus = (otherUserId: string): FriendStatus => {
    if (!user || !friendRequests.length) return null;

    // Check if there's a connection where the current user sent a request
    const sentRequest = friendRequests.find(
      (req: FriendRequest) => req.from_user_id === user.id && req.to_user_id === otherUserId
    );

    if (sentRequest) {
      return sentRequest.status === 'accepted' ? 'connected' : 'sent';
    }

    // Check if there's a connection where the current user received a request
    const receivedRequest = friendRequests.find(
      (req: FriendRequest) => req.from_user_id === otherUserId && req.to_user_id === user.id
    );

    if (receivedRequest) {
      return receivedRequest.status === 'accepted' ? 'connected' : 'received';
    }

    return null;
  };

  // Search for users to add as friends
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
        .neq('id', user.id)  // Don't show the current user
        .ilike('full_name', `%${query}%`)
        .order('full_name', { ascending: true })
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Mutation to send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (toUserId: string) => {
      if (!user) throw new Error('You must be logged in to send friend requests');

      // Check if a request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRequest) {
        throw new Error('A friend request already exists between these users');
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: user.id, 
          to_user_id: toUserId, 
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] });
    },
  });

  // Mutation to accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be logged in to accept friend requests');

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] });
    },
  });

  // Mutation to reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be logged in to reject friend requests');

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] });
    },
  });

  // Mutation to cancel a sent friend request
  const cancelFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be logged in to cancel friend requests');

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('from_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] });
    },
  });

  // Mutation to unfriend (remove an accepted connection)
  const unfriend = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('You must be logged in to remove friends');

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', user?.id] });
    },
  });

  return {
    friends,
    isLoading,
    error,
    checkFriendStatus,
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
