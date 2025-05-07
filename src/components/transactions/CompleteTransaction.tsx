
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { UserRating } from '@/components/ratings/UserRating';
import { Transaction } from '@/types/database';

interface CompleteTransactionProps {
  listingId: string;
  sellerId: string;
  buyerId: string;
  onComplete?: () => void;
}

export function CompleteTransaction({ listingId, sellerId, buyerId, onComplete }: CompleteTransactionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleOpenDialog = async () => {
    setIsOpen(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const handleCompleteTransaction = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    
    try {
      // First check if a transaction already exists
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('listing_id', listingId)
        .single();
      
      if (existingTransaction) {
        // If transaction already exists, update its status
        const { data, error } = await supabase
          .from('transactions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', existingTransaction.id)
          .select()
          .single();
          
        if (error) throw error;
        setTransaction(data as Transaction);
      } else {
        // Create a new transaction
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            listing_id: listingId,
            buyer_id: buyerId,
            seller_id: sellerId,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        setTransaction(data as Transaction);
      }
      
      // Update listing status
      await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId);
      
      // Show rating dialog
      setShowRating(true);
      
      toast({
        title: "Transaction completed",
        description: "The item has been marked as sold."
      });
      
    } catch (error: any) {
      toast({
        title: "Error completing transaction",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingComplete = () => {
    setIsOpen(false);
    
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
        onClick={handleOpenDialog}
      >
        Complete Transaction
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          {!showRating ? (
            <>
              <DialogHeader>
                <DialogTitle>Complete Transaction</DialogTitle>
                <DialogDescription>
                  Mark this transaction as completed. This will update the listing status to "Sold".
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">
                  By completing this transaction, you confirm that the payment has been made and the item has been delivered.
                </p>
                
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleCompleteTransaction}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Complete Transaction'}
                  </Button>
                </div>
              </div>
            </>
          ) : transaction ? (
            <UserRating 
              transaction={transaction}
              fromUserId={currentUserId!}
              toUserId={currentUserId === buyerId ? sellerId : buyerId}
              onComplete={handleRatingComplete}
            />
          ) : (
            <p>Something went wrong. Please try again.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
