
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Friend, Profile, FriendWithProfiles } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export function useFriends() {
  const { user } = useAuth();
  
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
  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return null;
    
    try {
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
      
      // Refetch to update the UI
      refetch();
      
      return data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  };

  // Function to accept a friend request
  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('receiver_id', user?.id); // Ensure the current user is the receiver
      
      if (error) throw error;
      
      // Refetch to update the UI
      refetch();
      
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  };

  // Function to reject a friend request
  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('receiver_id', user?.id); // Ensure the current user is the receiver
      
      if (error) throw error;
      
      // Refetch to update the UI
      refetch();
      
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  };

  return {
    friends: data || { sent: [], received: [], connected: [] },
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    checkFriendStatus,
    refetch
  };
}
