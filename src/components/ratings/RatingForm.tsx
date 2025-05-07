
import { useState } from 'react';
import { StarRating } from './StarRating';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateRating } from '@/hooks/useRatings';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface RatingFormProps {
  toUserId: string;
  itemId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RatingForm({ toUserId, itemId, onSuccess, onCancel }: RatingFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const createRating = useCreateRating();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to leave a rating",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive"
      });
      return;
    }

    try {
      await createRating.mutate({
        to_user_id: toUserId,
        from_user_id: user.id,
        item_id: itemId,
        rating,
        comment: comment.trim() || undefined
      }, {
        onSuccess: () => {
          toast({
            title: "Rating submitted",
            description: "Thank you for your feedback!",
          });
          if (onSuccess) onSuccess();
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-xl">Leave a Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-gray-600">How would you rate this experience?</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
              Comments (optional)
            </label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createRating.isPending || rating === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createRating.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
