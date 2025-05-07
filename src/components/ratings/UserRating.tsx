
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from './RatingStars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Transaction } from '@/types/database';

interface UserRatingProps {
  transaction: Transaction;
  fromUserId: string;
  toUserId: string;
  onComplete?: () => void;
}

export function UserRating({ transaction, fromUserId, toUserId, onComplete }: UserRatingProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          transaction_id: transaction.id,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback"
      });
      
      if (onComplete) onComplete();
    } catch (error: any) {
      toast({
        title: "Error submitting rating",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">How would you rate this transaction?</p>
            <RatingStars 
              rating={rating} 
              onChange={setRating} 
              interactive 
              size={24} 
            />
          </div>

          <div>
            <label htmlFor="comment" className="text-sm text-gray-600 block mb-2">
              Add a comment (optional)
            </label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
