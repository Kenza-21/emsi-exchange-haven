
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/database';

export function useListings(category: string | null = null, searchQuery: string = '') {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (category) {
          query = query.eq('category', category);
        }
        
        if (searchQuery) {
          query = query.ilike('title', `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setListings(data as Listing[]);
      } catch (err: any) {
        console.error('Error fetching listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
    
    // Subscribe to changes (real-time updates)
    const subscription = supabase
      .channel('listings-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'listings' 
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setListings(prevListings => [payload.new as Listing, ...prevListings]);
        } else if (payload.eventType === 'UPDATE') {
          setListings(prevListings => 
            prevListings.map(listing => 
              listing.id === payload.new.id ? payload.new as Listing : listing
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setListings(prevListings => 
            prevListings.filter(listing => listing.id !== payload.old.id)
          );
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [category, searchQuery]);

  return { listings, loading, error };
}
