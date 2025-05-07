
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { UserPlus, X, Check, Search, UserMinus } from 'lucide-react';

const FriendsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    friends,
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    searchQuery,
    setSearchQuery,
    searchUsers,
    searchResults,
    isSearching,
    refetch
  } = useFriends();
  const [showSearch, setShowSearch] = useState(false);
  
  if (authLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }
  
  if (!user) {
    toast({
      description: "You need to be logged in to view this page",
    });
    return <Navigate to="/login" />;
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers(searchQuery);
  };

  const handleSendFriendRequest = (userId: string) => {
    sendFriendRequest.mutate(userId, {
      onSuccess: () => {
        toast({
          title: "Friend request sent",
          description: "Your friend request has been sent!"
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to send friend request: " + error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleAcceptFriendRequest = (requestId: string) => {
    acceptFriendRequest.mutate(requestId, {
      onSuccess: () => {
        toast({
          title: "Friend request accepted",
          description: "You are now friends!"
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to accept friend request: " + error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleRejectFriendRequest = (requestId: string) => {
    rejectFriendRequest.mutate(requestId, {
      onSuccess: () => {
        toast({
          title: "Friend request rejected",
          description: "The friend request has been rejected."
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to reject friend request: " + error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleCancelFriendRequest = (requestId: string) => {
    cancelFriendRequest.mutate(requestId, {
      onSuccess: () => {
        toast({
          title: "Friend request cancelled",
          description: "Your friend request has been cancelled."
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to cancel friend request: " + error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleUnfriend = (friendId: string) => {
    unfriend.mutate(friendId, {
      onSuccess: () => {
        toast({
          title: "Unfriended",
          description: "You have removed this friend."
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to unfriend: " + error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Friends</h1>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error loading friends: {error.message}
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm" 
            className="ml-2"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Search Users */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Find Friends</h2>
              <Button 
                variant={showSearch ? "outline" : "default"} 
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                {showSearch ? "Hide" : "Find Friends"}
              </Button>
            </div>
            
            {showSearch && (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder="Search by name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </form>
                
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(user => (
                      <Card key={user.id} className="overflow-hidden">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{user.full_name}</h3>
                            <p className="text-sm text-gray-500">{user.student_id}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleSendFriendRequest(user.id)}
                            disabled={sendFriendRequest.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <p className="text-center text-gray-500 py-4">No users found</p>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Friend Requests */}
          {friends.received.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-medium mb-4">Friend Requests</h2>
              <div className="space-y-3">
                {friends.received.map(request => (
                  <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <h3 className="font-medium">{request.profile?.full_name}</h3>
                      <p className="text-sm text-gray-500">Wants to be friends</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleAcceptFriendRequest(request.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleRejectFriendRequest(request.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Pending Requests */}
          {friends.sent.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-medium mb-4">Pending Requests</h2>
              <div className="space-y-3">
                {friends.sent.map(request => (
                  <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <h3 className="font-medium">{request.profile?.full_name}</h3>
                      <p className="text-sm text-gray-500">Request pending</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleCancelFriendRequest(request.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Friends List */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-medium mb-4">My Friends</h2>
            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Loading friends...</p>
            ) : friends.connected.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.connected.map(friend => (
                  <Card key={friend.id} className="overflow-hidden">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">
                          {friend.profile?.full_name}
                        </h3>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-gray-600 hover:text-red-600"
                        onClick={() => handleUnfriend(friend.from_user_id === user.id ? friend.to_user_id : friend.from_user_id)}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Unfriend
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                You don't have any friends yet. Use the search to find friends!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
