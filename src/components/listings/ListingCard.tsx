
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Listing } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFirstImage = async () => {
      try {
        const { data, error } = await supabase
          .from('images')
          .select('url')
          .eq('listing_id', listing.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (error) {
          console.error('Error fetching image:', error);
          setIsLoading(false);
          return;
        }
        
        if (data) {
          setImageUrl(data.url);
        }
      } catch (err) {
        console.error('Failed to fetch image:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFirstImage();
  }, [listing.id]);

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="h-48 bg-gray-200 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse w-8 h-8 rounded-full bg-gray-300"></div>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <span>No image</span>
            </div>
          )}
          
          {listing.status !== "active" && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-800">
                {listing.status === "sold" ? "SOLD" : "RESERVED"}
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between mb-1">
            <span className="font-medium text-emerald-600">
              {listing.price ? `${listing.price.toFixed(2)} MAD` : 'Free'}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 truncate">{listing.title}</h3>
          <div className="flex gap-2 mt-2">
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {listing.category}
            </span>
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {listing.condition}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
