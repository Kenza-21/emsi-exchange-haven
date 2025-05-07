
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type FriendStatus = 'connected' | 'sent' | 'received' | null;

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to fetch user's friend connections
  const { data: friendConnections = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('from_user_id', user.id);

      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('to_user_id', user.id);

      if (sentError || receivedError) {
        console.error('Error fetching friend requests:', sentError || receivedError);
        return [];
      }

      return [...(sentRequests || []), ...(receivedRequests || [])];
    },
    enabled: !!user,
  });

  // Function to check friend status with another user
  const checkFriendStatus = (otherUserId: string): FriendStatus => {
    if (!user || !friendConnections.length) return null;

    // Check if there's a connection where the current user sent a request
    const sentRequest = friendConnections.find(
      c => c.from_user_id === user.id && c.to_user_id === otherUserId
    );

    if (sentRequest) {
      return sentRequest.status === 'accepted' ? 'connected' : 'sent';
    }

    // Check if there's a connection where the current user received a request
    const receivedRequest = friendConnections.find(
      c => c.from_user_id === otherUserId && c.to_user_id === user.id
    );

    if (receivedRequest) {
      return receivedRequest.status === 'accepted' ? 'connected' : 'received';
    }

    return null;
  };

  // Mutation to send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (toUserId: string) => {
      if (!user) throw new Error('You must be logged in to send friend requests');

      // Check if a request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
        .single();

      if (existingRequest) {
        throw new Error('A friend request already exists between these users');
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .insert([
          { from_user_id: user.id, to_user_id: toUserId, status: 'pending' }
        ]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
  });

  // Mutation to accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be logged in to accept friend requests');

      const { data, error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
  });

  // Mutation to reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be logged in to reject friend requests');

      const { data, error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
  });

  return {
    friendConnections,
    loadingFriends,
    checkFriendStatus,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest
  };
}
