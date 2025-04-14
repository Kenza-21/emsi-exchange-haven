
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { LostFound, Profile } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

const LostFoundPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<(LostFound & { user_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch lost & found items
  useState(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('lost_found')
          .select(`
            *,
            profiles:user_id (
              full_name
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setItems(data as any);
      } catch (error) {
        console.error('Error fetching lost & found items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  });

  // Filter items based on search term
  const filteredItems = searchTerm
    ? items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lost & Found</h1>
        {user && (
          <Link to="/lost-found/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Report Found Item
            </Button>
          </Link>
        )}
      </div>
      
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for lost items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          Array(8).fill(0).map((_, index) => (
            <div key={index} className="h-72 bg-gray-200 animate-pulse rounded-lg"></div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">No items found</h3>
            <p className="text-gray-500 mt-2">No lost & found items match your search</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <Link key={item.id} to={`/lost-found/${item.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full">
                <div className="h-48 bg-gray-200 relative">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <span>No Image</span>
                    </div>
                  )}
                  {item.status === 'claimed' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-800">
                        CLAIMED
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-800 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Found at: {item.location}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-gray-500">
                      By: {(item as any).profiles?.full_name || 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default LostFoundPage;
