
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Listing, LostFound } from '@/types/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageSquare, AlertCircle, PlusCircle, Package } from 'lucide-react';

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<LostFound[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setDashboardLoading(true);
        
        // Fetch user's listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (listingsError) throw listingsError;
        
        // Fetch user's lost & found items
        const { data: lostFoundData, error: lostFoundError } = await supabase
          .from('lost_found')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (lostFoundError) throw lostFoundError;
        
        // Count unread messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('receiver_id', user.id)
          .eq('read', false);
        
        if (messagesError) throw messagesError;
        
        setListings(listingsData || []);
        setLostFoundItems(lostFoundData || []);
        setUnreadMessages(messagesData?.length || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setDashboardLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);
  
  if (loading || dashboardLoading) {
    return <div className="container mx-auto py-8 px-4">Loading dashboard data...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 md:mb-0">Dashboard</h1>
        <div className="flex space-x-3">
          <Link to="/create-listing">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Sell Something
            </Button>
          </Link>
          <Link to="/lost-found/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <AlertCircle className="mr-2 h-4 w-4" />
              Report Found Item
            </Button>
          </Link>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Messages Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <MessageSquare className="mr-2 h-5 w-5 text-emerald-600" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unreadMessages > 0 ? (
              <div className="text-2xl font-bold">{unreadMessages} unread messages</div>
            ) : (
              <p className="text-gray-600">No unread messages</p>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/messages" className="w-full">
              <Button className="w-full" variant="outline">
                View Messages
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Listings Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Package className="mr-2 h-5 w-5 text-emerald-600" />
              My Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length} items</div>
            {listings.length > 0 && (
              <p className="text-gray-600 mt-1">Latest: {listings[0]?.title}</p>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/profile" className="w-full">
              <Button className="w-full" variant="outline">
                Manage Listings
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Lost & Found Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <AlertCircle className="mr-2 h-5 w-5 text-emerald-600" />
              Lost & Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lostFoundItems.length} items</div>
            {lostFoundItems.length > 0 && (
              <p className="text-gray-600 mt-1">Latest: {lostFoundItems[0]?.title}</p>
            )}
          </CardContent>
          <CardFooter>
            <Link to="/lost-found" className="w-full">
              <Button className="w-full" variant="outline">
                View Lost & Found
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      {/* Recent Activity Section */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-10 mb-4">Recent Activity</h2>
      <div className="grid grid-cols-1 gap-4">
        {[...listings, ...lostFoundItems]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((item) => (
            <Card key={'id' in item ? item.id : ''} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-500">
                    {'price' in item ? (
                      `Listed for ${item.price?.toFixed(2)} MAD`
                    ) : (
                      `${item.status === 'found' ? 'Found' : 'Lost'} item at ${item.location || 'EMSI'}`
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link to={'price' in item ? `/listing/${item.id}` : `/lost-found/${item.id}`}>
                  <Button variant="ghost" size="sm">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          
        {listings.length === 0 && lostFoundItems.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p className="mb-4">You haven't created any listings or reported any lost items yet.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/create-listing">
                <Button className="bg-emerald-600 hover:bg-emerald-700 w-full">
                  Create Your First Listing
                </Button>
              </Link>
              <Link to="/lost-found/create">
                <Button variant="outline" className="w-full">
                  Report a Found Item
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
