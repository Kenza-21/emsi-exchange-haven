
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Rating, Profile } from '@/types/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUserRatings(userId: string) {
  return useQuery({
    queryKey: ['ratings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          from_user:profiles!from_user_id(full_name)
        `)
        .eq('to_user_id', userId);

      if (error) throw new Error(error.message);
      return data as (Rating & { from_user: { full_name: string } })[];
    },
    enabled: !!userId
  });
}

export function useCreateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRating: {
      to_user_id: string;
      from_user_id: string;
      item_id?: string;
      rating: number;
      comment?: string;
    }) => {
      const { error, data } = await supabase
        .from('ratings')
        .insert([newRating])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the ratings query for the user who received the rating
      queryClient.invalidateQueries({ queryKey: ['ratings', variables.to_user_id] });
    }
  });
}

export function useUserAverageRating(userId: string) {
  return useQuery({
    queryKey: ['average-rating', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('to_user_id', userId);

      if (error) throw new Error(error.message);
      
      if (!data || data.length === 0) {
        return { average: 0, count: 0 };
      }
      
      const total = data.reduce((sum, item) => sum + item.rating, 0);
      return { 
        average: parseFloat((total / data.length).toFixed(1)), 
        count: data.length 
      };
    },
    enabled: !!userId
  });
}

export function useTransactionParticipants(listingId: string) {
  return useQuery({
    queryKey: ['transaction-participants', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('buyer_id, seller_id, status')
        .eq('listing_id', listingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No transaction found
          return null;
        }
        throw new Error(error.message);
      }
      
      return data;
    },
    enabled: !!listingId
  });
}

export function useHasRated(fromUserId: string, toUserId: string, itemId?: string) {
  return useQuery({
    queryKey: ['has-rated', fromUserId, toUserId, itemId],
    queryFn: async () => {
      let query = supabase
        .from('ratings')
        .select('id')
        .eq('from_user_id', fromUserId)
        .eq('to_user_id', toUserId);
        
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data && data.length > 0;
    },
    enabled: !!fromUserId && !!toUserId
  });
}
