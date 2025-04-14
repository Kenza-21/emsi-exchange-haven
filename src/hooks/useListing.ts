
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Listing, Image, Profile } from '@/types/database';

interface ListingDetails {
  listing: Listing | null;
  images: Image[];
  seller: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useListing(listingId: string): ListingDetails {
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListingDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch listing
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();
        
        if (listingError) throw listingError;
        
        setListing(listingData as Listing);
        
        // Fetch images
        const { data: imageData, error: imageError } = await supabase
          .from('images')
          .select('*')
          .eq('listing_id', listingId);
        
        if (imageError) throw imageError;
        
        setImages(imageData as Image[]);
        
        // Fetch seller info
        if (listingData) {
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', listingData.user_id)
            .single();
          
          if (sellerError) throw sellerError;
          
          setSeller(sellerData as Profile);
        }
      } catch (err: any) {
        console.error('Error fetching listing details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (listingId) {
      fetchListingDetails();
    }
    
    // Subscribe to changes
    const listingSubscription = supabase
      .channel('listing-details')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'listings',
        filter: `id=eq.${listingId}`
      }, payload => {
        setListing(payload.new as Listing);
      })
      .subscribe();
      
    return () => {
      listingSubscription.unsubscribe();
    };
  }, [listingId]);

  return { listing, images, seller, loading, error };
}
