
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Listing, Profile } from '@/types/database';
import { AccountForm } from '@/components/profile/AccountForm';
import { UserListings } from '@/components/profile/UserListings';
import { MessagesTab } from '@/components/profile/MessagesTab';
import { UserRatings } from '@/components/ratings/UserRatings';

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const profileId = userId || user?.id;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  useEffect(() => {
    // Check if this is the current user's own profile
    setIsOwnProfile(!userId || (user && userId === user.id));
    
    const fetchProfile = async () => {
      if (!profileId) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();
          
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    const fetchListings = async () => {
      if (!profileId) return;
      
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setMyListings(data);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoadingListings(false);
      }
    };

    if (profileId) {
      fetchProfile();
      fetchListings();
    }
  }, [profileId, user, userId]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleListingDelete = (deletedListingId: string) => {
    setMyListings(prev => prev.filter(listing => listing.id !== deletedListingId));
  };
  
  if (loading || loadingProfile) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }
  
  if (!profileId || (!user && !userId)) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isOwnProfile ? 'My Profile' : `${profile?.full_name}'s Profile`}
      </h1>
      
      <Tabs defaultValue={isOwnProfile ? "account" : "listings"}>
        <TabsList className="mb-6">
          {isOwnProfile && <TabsTrigger value="account">Account</TabsTrigger>}
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="messages">Messages</TabsTrigger>}
        </TabsList>
        
        {isOwnProfile && (
          <TabsContent value="account">
            <AccountForm profile={profile} onProfileUpdate={handleProfileUpdate} />
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={signOut} 
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="listings">
          <UserListings 
            listings={myListings} 
            onListingDelete={isOwnProfile ? handleListingDelete : undefined} 
          />
        </TabsContent>
        
        <TabsContent value="ratings">
          {profileId && <UserRatings userId={profileId} />}
        </TabsContent>
        
        {isOwnProfile && (
          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProfilePage;
