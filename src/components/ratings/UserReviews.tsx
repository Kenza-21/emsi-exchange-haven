
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RatingStars } from './RatingStars';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  from_user: {
    full_name: string | null;
  };
}

interface UserReviewsProps {
  userId: string;
}

export function UserReviews({ userId }: UserReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number>(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('ratings')
          .select(`
            id, 
            rating, 
            comment, 
            created_at,
            from_user:from_user_id (full_name)
          `)
          .eq('to_user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setReviews(data as unknown as Review[]);
          
          // Calculate average rating
          const sum = data.reduce((acc, current) => acc + current.rating, 0);
          setAvgRating(sum / data.length);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchReviews();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">User Reviews</h3>
        <div className="flex items-center">
          <RatingStars rating={avgRating} size={16} />
          <span className="ml-2 text-sm text-gray-600">
            {avgRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <Card key={review.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    <User size={16} />
                  </div>
                  <div className="ml-2">
                    <p className="font-medium">{review.from_user?.full_name || 'Anonymous'}</p>
                    <div className="flex items-center">
                      <RatingStars rating={review.rating} size={14} />
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {review.comment && (
                <div className="mt-2 text-gray-700">
                  <p>{review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
