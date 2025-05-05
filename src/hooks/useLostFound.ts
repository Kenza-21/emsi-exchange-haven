
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LostFound, Profile } from '@/types/database';

interface LostFoundDetails {
  item: (LostFound & { user_profile?: Profile }) | null;
  owner: Profile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLostFound(itemId: string): LostFoundDetails {
  const [item, setItem] = useState<(LostFound & { user_profile?: Profile }) | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItemDetails = async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('lost_found')
        .select(`
          *,
          user_profile:profiles(*)
        `)
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      setItem(data as any);
      setOwner(data.user_profile as Profile);
    } catch (err: any) {
      console.error('Error fetching lost & found item details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetails();
    
    // Subscribe to changes
    const itemSubscription = supabase
      .channel('lost-found-details')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'lost_found',
        filter: `id=eq.${itemId}`
      }, payload => {
        // When item is updated, refresh to get the latest data with relations
        fetchItemDetails();
      })
      .subscribe();
      
    return () => {
      itemSubscription.unsubscribe();
    };
  }, [itemId]);

  const refetch = async () => {
    await fetchItemDetails();
  };

  return { item, owner, loading, error, refetch };
}
