
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowRightCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { LostFound } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const LostFoundPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<(LostFound & { user_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'lost'>('all');
  
  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lost_found')
        .select(`
          *,
          user_profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Format data to include user name
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        user_name: item.user_profile?.full_name
      }));
      
      setItems(formattedData);
    } catch (error) {
      console.error('Error fetching lost & found items:', error);
      toast({
        title: "Error",
        description: "Failed to load lost & found items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchItems();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('lost-found-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lost_found'
      }, () => {
        fetchItems();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Filter items based on search query and status
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      !searchQuery.trim() || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const handleStatusFilter = (status: 'all' | 'found' | 'lost') => {
    setStatusFilter(status);
  };
  
  const handleDelete = async (itemId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('lost_found')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state - remove the deleted item
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      toast({
        title: "Success",
        description: "Item was successfully deleted",
      });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Lost & Found</h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'found' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleStatusFilter('found')}
            >
              Found Items
            </Button>
            <Button 
              variant={statusFilter === 'lost' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleStatusFilter('lost')}
            >
              Lost Items
            </Button>
          </div>
          
          <Link to="/lost-found/create">
            <Button className="w-full sm:w-auto">
              <Plus size={18} className="mr-2" /> Report Item
            </Button>
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No items found.</p>
          <Link to="/lost-found/create" className="text-emerald-600 hover:underline mt-2 block">
            Report a lost or found item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className={`mb-2 ${item.status === 'found' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {item.status === 'found' ? 'Found Item' : 'Lost Item'}
                    </Badge>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {item.image_url && (
                  <div className="mb-4 rounded-md overflow-hidden aspect-video">
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {item.description && (
                  <p className="text-gray-600 text-sm line-clamp-3 mb-2">{item.description}</p>
                )}
                
                {item.location && (
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Location:</span> {item.location}
                  </p>
                )}
                
                <p className="text-gray-500 text-xs mt-2">
                  {item.found_date && `${item.status === 'found' ? 'Found' : 'Lost'} on ${new Date(item.found_date).toLocaleDateString()}`}
                </p>
                
                <p className="text-gray-500 text-xs mt-1">
                  Posted {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  {item.user_name && ` by ${item.user_name}`}
                </p>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-3 border-t">
                <Link 
                  to={`/lost-found/${item.id}`}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center"
                >
                  View Details
                  <ArrowRightCircle size={16} className="ml-1" />
                </Link>
                
                {user?.id === item.user_id && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
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
