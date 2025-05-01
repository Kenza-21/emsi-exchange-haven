import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

const FriendsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    friends, 
    pendingRequests, 
    loading,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    sendFriendRequest
  } = useFriends();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  if (authLoading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);
        
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (err: any) {
      console.error('Error searching for users:', err);
      toast({
        title: "Error",
        description: "Failed to search for users"
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Friends</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search and Add Friends */}
        <Card>
          <CardHeader>
            <CardTitle>Find Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-gray-800 hover:bg-gray-900"
                disabled={searching}
              >
                Search
              </Button>
            </form>
            
            <div>
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map(profile => {
                    const isFriend = friends.some(f => 
                      (f.sender_id === profile.id && f.receiver_id === user.id) || 
                      (f.receiver_id === profile.id && f.sender_id === user.id)
                    );
                    const hasSentRequest = pendingRequests.some(p => 
                      p.sender_id === user.id && p.receiver_id === profile.id
                    );
                    
                    return (
                      <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{profile.full_name}</p>
                          <p className="text-sm text-gray-500">Student ID: {profile.student_id}</p>
                        </div>
                        {isFriend ? (
                          <Button disabled variant="outline">Already Friends</Button>
                        ) : hasSentRequest ? (
                          <Button disabled variant="outline">Request Sent</Button>
                        ) : (
                          <Button 
                            onClick={() => sendFriendRequest(profile.id)}
                            variant="outline"
                            className="flex items-center"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add Friend
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery && !searching ? (
                <p className="text-center text-gray-500 py-4">No users found</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        
        {/* Friend Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No pending friend requests</div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{request.profile?.full_name || "Unknown User"}</p>
                      <p className="text-sm text-gray-500">Student ID: {request.profile?.student_id || "N/A"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => acceptFriendRequest(request.id)}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-green-600 border-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => rejectFriendRequest(request.id)}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-red-600 border-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Friend List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your Friends</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="text-center text-gray-500 py-4">You don't have any friends yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map(friend => {
                const friendProfile = friend.profile;
                
                return (
                  <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{friendProfile?.full_name || "Unknown User"}</p>
                      <p className="text-sm text-gray-500">Student ID: {friendProfile?.student_id || "N/A"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => removeFriend(friend.id)}
                        variant="outline"
                        className="text-red-600 border-red-600"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FriendsPage;
