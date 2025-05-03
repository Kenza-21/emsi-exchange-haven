import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLostFound } from '@/hooks/useLostFound';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const LostFoundDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { item, owner, loading, error, refetch } = useLostFound(id || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !owner || !messageContent.trim() || !item) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: owner.id,
          lost_found_id: item.id,
          content: messageContent.trim(),
          read: false
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the owner."
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
  
  const handleDelete = async () => {
    if (!user || !item || user.id !== item.user_id) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('lost_found')
        .delete()
        .eq('id', item.id);
        
      if (error) throw error;
      
      toast({
        title: "Item Deleted",
        description: "The item has been successfully deleted."
      });
      
      navigate('/lost-found');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
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

  if (error || !item) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading item: {error || 'Item not found'}
        </div>
        <div className="mt-4">
          <Link to="/lost-found" className="text-emerald-600 hover:underline flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lost & Found
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/lost-found" className="text-emerald-600 hover:underline flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lost & Found
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Image and Description */}
        <div className="md:col-span-2">
          {item.image_url ? (
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={item.image_url} 
                alt={item.title}
                className="w-full h-80 object-contain"
              />
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg flex items-center justify-center h-80">
              <span className="text-gray-500">No image available</span>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{item.description || 'No description provided.'}</p>
          </div>
        </div>

        {/* Item Details */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{item.title}</h1>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  {item.status === 'found' ? 'Found' : 'Lost'} {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-500">
                  Found on: {format(new Date(item.found_date), 'PPP')}
                </p>
                {item.location && (
                  <p className="text-sm text-gray-500">
                    Location: {item.location}
                  </p>
                )}
              </div>
              
              <div className="border-t border-gray-200 my-4 pt-4">
                <h3 className="font-medium text-gray-700 mb-2">
                  {item.status === 'found' ? 'Finder' : 'Owner'}
                </h3>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    {owner?.full_name?.[0] || '?'}
                  </div>
                  <span className="ml-3 font-medium">{owner?.full_name}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                {user && user.id !== item.user_id ? (
                  <Button 
                    onClick={() => setIsMessageModalOpen(true)} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact {item.status === 'found' ? 'Finder' : 'Owner'}
                  </Button>
                ) : user && user.id === item.user_id ? (
                  <div className="space-y-2">
                    <Button 
                      onClick={handleDelete}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Item
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Link to="/login">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Sign in to contact {item.status === 'found' ? 'finder' : 'owner'}
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
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Message the {item.status === 'found' ? 'Finder' : 'Owner'}</h3>
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

export default LostFoundDetailsPage;
