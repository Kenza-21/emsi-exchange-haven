
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LostFound, Profile } from '@/types/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { toast } from '@/hooks/use-toast';

interface LostFoundWithUser extends LostFound {
  user_profile?: Profile;
}

const LostFoundPage = () => {
  const [items, setItems] = useState<LostFoundWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchLostFoundItems = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('lost_found')
          .select(`
            *,
            user_profile:profiles(*)
          `)
          .order('created_at', { ascending: false });
        
        if (searchQuery) {
          query = query.ilike('title', `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setItems(data as LostFoundWithUser[]);
      } catch (err: any) {
        console.error('Error fetching lost & found items:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLostFoundItems();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('lost-found-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lost_found' 
      }, () => {
        fetchLostFoundItems();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The searchQuery state will trigger the useEffect
  };

  const handleDelete = async (itemId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('lost_found')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id); // Ensure user can only delete their own items
      
      if (error) throw error;
      
      // Optimistically remove the item from the UI
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      toast({
        title: "Item Deleted",
        description: "The item has been successfully deleted."
      });
    } catch (err: any) {
      console.error('Error deleting item:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete the item.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Lost & Found</h1>
        
        {user && (
          <Link to="/lost-found/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Report Item
            </Button>
          </Link>
        )}
      </div>
      
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for lost & found items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="bg-gray-800 hover:bg-gray-900">
            Search
          </Button>
        </form>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="flex flex-col animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <CardContent className="py-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to load lost & found items: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 mb-4">No lost & found items available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(item => (
            <Card key={item.id} className="flex flex-col overflow-hidden">
              <div className="h-48 bg-gray-100 relative">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
                <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${
                  item.status === 'lost' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-emerald-500 text-white'
                }`}>
                  {item.status}
                </span>
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-1">{item.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}
                
                {item.location && (
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-medium">Location:</span> {item.location}
                  </p>
                )}
                
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Found:</span> {new Date(item.found_date).toLocaleDateString()}
                </p>
                
                <p className="text-xs text-gray-400 mt-2">
                  Posted by {item.user_profile?.full_name || 'Unknown'} {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </CardContent>
              
              <CardFooter className="border-t bg-gray-50 p-3 flex justify-between">
                <Link to={`/lost-found/${item.id}`} className="flex-1 mr-2">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
                
                {user && user.id === item.user_id && (
                  <Button 
                    variant="outline" 
                    className="border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LostFoundPage;
