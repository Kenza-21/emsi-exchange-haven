
import { StarRating } from './StarRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRatings, useUserAverageRating } from '@/hooks/useRatings';
import { formatDistanceToNow } from 'date-fns';

interface UserRatingsProps {
  userId: string;
}

export function UserRatings({ userId }: UserRatingsProps) {
  const { data: ratings, isLoading, error } = useUserRatings(userId);
  const { data: averageRating } = useUserAverageRating(userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading ratings: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ratings & Reviews</span>
          {averageRating && (
            <div className="flex items-center space-x-2">
              <StarRating value={averageRating.average} readonly size="sm" />
              <span className="text-sm text-gray-600">
                {averageRating.average.toFixed(1)} ({averageRating.count} {averageRating.count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ratings || ratings.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No reviews yet</p>
        ) : (
          <div className="space-y-6">
            {ratings.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    <StarRating value={review.rating} readonly size="sm" />
                    <span className="ml-2 text-sm font-medium">{review.from_user.full_name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
                {review.comment && <p className="text-gray-700 text-sm mt-1">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
