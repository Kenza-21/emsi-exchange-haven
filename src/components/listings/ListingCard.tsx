
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Listing } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

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
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
        <div className="h-48 bg-gray-100 relative">
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
          
          <Badge className={`absolute top-2 right-2 ${
            listing.status === "active" 
              ? "bg-emerald-500 hover:bg-emerald-600" 
              : listing.status === "sold" 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-yellow-500 hover:bg-yellow-600"
          }`}>
            {listing.status.toUpperCase()}
          </Badge>
        </div>
        <CardContent className="p-4 flex-grow flex flex-col">
          <h3 className="font-semibold text-gray-800 text-lg mb-2">{listing.title}</h3>
          
          {listing.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {listing.description}
            </p>
          )}
          
          <div className="mt-auto pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-emerald-600 text-lg">
                {listing.price ? `${listing.price} MAD` : 'Free'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-gray-50">
                {listing.category}
              </Badge>
              <Badge variant="outline" className="bg-gray-50">
                {listing.condition}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
