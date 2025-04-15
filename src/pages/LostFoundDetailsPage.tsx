
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LostFound, Profile } from '@/types/database';

const LostFoundDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<(LostFound & { user_profile?: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItemDetails = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('lost_found')
          .select(`
            *,
            user_profile:profiles(*)
          `)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setItem(data as any);
      } catch (err: any) {
        console.error('Error fetching lost & found item details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id]);

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
            <span>Found {formatDistanceToNow(new Date(item.found_date), { addSuffix: true })}</span>
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
                    item.status === 'found' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.status === 'found' ? 'Found' : 'Claimed'}
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
              <h2 className="text-xl font-semibold mb-4">Contact</h2>
              <Button 
                className="w-full"
                onClick={handleContact}
                disabled={user?.id === item.user_id}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Contact {(item as any).user_profile?.full_name || 'Owner'}
              </Button>
              {user?.id === item.user_id && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  This is your item
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LostFoundDetailsPage;
