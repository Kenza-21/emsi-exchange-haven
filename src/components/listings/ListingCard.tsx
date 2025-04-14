
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Listing } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="h-48 bg-gray-200 relative">
          {/* This will be replaced with actual images from Supabase storage */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            {listing.status !== "active" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-800">
                  {listing.status === "sold" ? "SOLD" : "RESERVED"}
                </span>
              </div>
            )}
            <span>Image</span>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between mb-1">
            <span className="font-medium text-emerald-600">{listing.price.toFixed(2)} MAD</span>
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
