
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useListing } from '@/hooks/useListing';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

const ListingPage = () => {
  const { id } = useParams<{ id: string }>();
  const { listing, images, seller, loading, error } = useListing(id || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !seller || !message.trim()) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: seller.id,
          listing_id: listing?.id,
          content: message.trim(),
          read: false
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the seller."
      });
      
      setMessage('');
      setIsMessageModalOpen(false);
      navigate('/messages');
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
        </div>

        {/* Listing details */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{listing.title}</h1>
              <p className="text-2xl font-semibold text-emerald-600 mb-4">{listing.price.toFixed(2)} MAD</p>
              
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
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    {seller?.full_name?.[0] || '?'}
                  </div>
                  <span className="ml-3 font-medium">{seller?.full_name}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6">
                {user && user.id !== listing.user_id ? (
                  <Button 
                    onClick={() => setIsMessageModalOpen(true)} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Seller
                  </Button>
                ) : user && user.id === listing.user_id ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                      disabled
                    >
                      This is your listing
                    </Button>
                    {/* Could add edit/delete buttons here */}
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
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
