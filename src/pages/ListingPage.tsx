
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useListing } from '@/hooks/useListing';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RatingForm } from '@/components/ratings/RatingForm';
import { useTransactionParticipants, useHasRated } from '@/hooks/useRatings';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ListingPage = () => {
  const { id } = useParams<{ id: string }>();
  const { listing, images, seller, loading, error } = useListing(id || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  
  const queryClient = useQueryClient();
  const listingId = id || '';
  
  // Check if transaction exists for this listing
  const { data: transaction } = useTransactionParticipants(listingId);
  
  // Check if the current user has already rated the seller for this listing
  const { data: hasRated } = useHasRated(
    user?.id || '', 
    seller?.id || '', 
    listingId
  );
  
  // Determine if the user can rate the seller
  const canRate = user && 
    seller && 
    user.id !== seller.id && 
    transaction && 
    (transaction.buyer_id === user.id || transaction.seller_id === user.id) &&
    transaction.status === 'completed' && 
    !hasRated;
  
  // Create a mutation to update a transaction to "completed" status
  const markCompleted = useMutation({
    mutationFn: async () => {
      if (!user || !listing) return null;
      
      const { error, data } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('listing_id', listing.id)
        .eq('seller_id', listing.user_id)
        .eq('buyer_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Update listing status to "sold"
      return supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
          toast({
            title: 'Transaction Completed',
            description: 'You can now leave a rating for the seller.'
          });
        });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Create a new transaction mutation
  const createTransaction = useMutation({
    mutationFn: async () => {
      if (!user || !listing) return null;
      
      const { error, data } = await supabase
        .from('transactions')
        .insert({
          listing_id: listing.id,
          seller_id: listing.user_id,
          buyer_id: user.id,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Transaction Created',
        description: 'Transaction has been initiated.'
      });
      queryClient.invalidateQueries({ queryKey: ['transaction-participants', listingId] });
    },
    onError: (error: any) => {
      if (error.code === '23505') { // Unique violation
        toast({
          title: 'Transaction Exists',
          description: 'You already have a pending transaction for this listing.'
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  });
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !seller || !messageContent.trim() || !listing) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: seller.id,
          listing_id: listing.id,
          content: messageContent.trim(),
          read: false
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the seller."
      });
      
      setMessageContent('');
      setIsMessageModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle buy/interest button click
  const handleBuyInterest = () => {
    if (!user || !listing) {
      toast({
        title: "Login Required",
        description: "Please log in to perform this action",
        variant: "destructive"
      });
      return;
    }
    
    createTransaction.mutate();
  };
  
  // Handle completing a transaction
  const handleCompleteTransaction = () => {
    if (window.confirm("Are you sure you want to mark this transaction as completed? This will update the listing status to 'Sold'.")) {
      markCompleted.mutate();
    }
  };
  
  // Handle closing the rating form
  const handleRatingSuccess = () => {
    setShowRatingForm(false);
    queryClient.invalidateQueries({ queryKey: ['has-rated', user?.id, seller?.id, listingId] });
    toast({
      title: "Rating Submitted",
      description: "Thank you for your feedback!"
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading listing: {error || 'Listing not found'}
        </div>
        <div className="mt-4">
          <Link to="/" className="text-emerald-600 hover:underline flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/" className="text-emerald-600 hover:underline flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to listings
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Image gallery */}
        <div className="md:col-span-2">
          {images.length > 0 ? (
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              {/* Display the first image as main image */}
              <img 
                src={images[0].url} 
                alt={listing.title}
                className="w-full h-80 object-contain"
              />
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-2">
                  {images.map(image => (
                    <div key={image.id} className="h-20 w-20 rounded overflow-hidden">
                      <img 
                        src={image.url} 
                        alt="" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg flex items-center justify-center h-80">
              <span className="text-gray-500">No images available</span>
            </div>
          )}

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
          </div>
          
          {/* Rating Form */}
          {showRatingForm && seller && (
            <div className="mt-8">
              <RatingForm 
                toUserId={seller.id} 
                itemId={listing.id} 
                onSuccess={handleRatingSuccess} 
                onCancel={() => setShowRatingForm(false)}
              />
            </div>
          )}
        </div>

        {/* Listing details */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{listing.title}</h1>
              <p className="text-2xl font-semibold text-emerald-600 mb-4">{listing.price ? `${listing.price.toFixed(2)} MAD` : 'Price not specified'}</p>
              
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                    {listing.category}
                  </span>
                  <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                    {listing.condition}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <div className="border-t border-gray-200 my-4 pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Seller</h3>
                <Link to={`/profile/${seller?.id}`} className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    {seller?.full_name?.[0] || '?'}
                  </div>
                  <span className="ml-3 font-medium">{seller?.full_name}</span>
                </Link>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                {user && user.id !== listing.user_id ? (
                  <>
                    {listing.status === 'sold' ? (
                      <Button 
                        disabled
                        className="w-full bg-gray-300 text-gray-700 cursor-not-allowed"
                      >
                        This item has been sold
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={() => setIsMessageModalOpen(true)} 
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Contact Seller
                        </Button>
                        
                        {transaction ? (
                          transaction.status === 'pending' && transaction.buyer_id === user.id ? (
                            <Button 
                              onClick={handleCompleteTransaction}
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                              Complete Transaction
                            </Button>
                          ) : transaction.status === 'completed' ? (
                            hasRated ? (
                              <Button 
                                disabled
                                className="w-full bg-gray-300 text-gray-700"
                              >
                                You've already rated this seller
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => setShowRatingForm(true)}
                                className="w-full bg-yellow-500 hover:bg-yellow-600"
                              >
                                Rate Seller
                              </Button>
                            )
                          ) : null
                        ) : (
                          <Button 
                            onClick={handleBuyInterest}
                            disabled={createTransaction.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {createTransaction.isPending ? 'Processing...' : 'I want to buy this'}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : user && user.id === listing.user_id ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                      disabled
                    >
                      This is your listing
                    </Button>
                  </div>
                ) : (
                  <Link to="/login">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Sign in to contact seller
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Message the Seller</h3>
              <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                  <textarea
                    className="w-full border rounded-lg p-3 min-h-[100px]"
                    placeholder="Write your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMessageModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSending}
                  >
                    {isSending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingPage;
