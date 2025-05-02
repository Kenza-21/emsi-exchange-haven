
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useLostFound } from '@/hooks/useLostFound';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const LostFoundDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { item, loading, error } = useLostFound(id || '');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || !item) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('lost_found')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id); // Ensure user can only delete their own items
      
      if (error) throw error;
      
      toast({
        title: "Item Deleted",
        description: "The item has been successfully deleted."
      });
      
      // Navigate back to the lost & found list
      navigate('/lost-found');
    } catch (err: any) {
      console.error('Error deleting item:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete the item.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact the owner",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!item || !item.user_id) {
      toast({
        title: "Error",
        description: "Could not contact the owner, missing information",
        variant: "destructive"
      });
      return;
    }

    // Don't allow messaging yourself
    if (user.id === item.user_id) {
      toast({
        title: "Cannot message yourself",
        description: "This is your own lost & found item",
      });
      return;
    }

    // Navigate to messages with pre-selected user
    navigate('/messages', { 
      state: { 
        contactUserId: item.user_id,
        itemContext: {
          type: 'lostfound',
          id: item.id,
          title: item.title
        }
      } 
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error || "Item not found"}</p>
          <Button className="mt-4" onClick={() => navigate('/lost-found')}>
            Back to Lost & Found
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/lost-found')}
          >
            ← Back to Lost & Found
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{item.title}</h1>
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <span>{item.status === 'found' ? 'Found' : 'Lost'} {formatDistanceToNow(new Date(item.found_date), { addSuffix: true })}</span>
            <span className="mx-2">•</span>
            <span>Posted by {(item as any).user_profile?.full_name || 'Unknown'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  className="w-full object-cover object-center h-80"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No Image Available</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {item.description || "No description provided"}
              </p>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Details</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 font-medium">Status: </span>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'found' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.status === 'found' ? 'Found' : 'Lost'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Location: </span>
                  <span className="text-gray-700">{item.location || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Found Date: </span>
                  <span className="text-gray-700">
                    {new Date(item.found_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              {user?.id === item.user_id ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-2">
                    This is your item
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Item
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the item.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <Button 
                  className="w-full"
                  onClick={handleContact}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact {(item as any).user_profile?.full_name || 'Owner'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LostFoundDetailsPage;
