
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Listing } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface UserListingsProps {
  listings: Listing[];
  onListingDelete: (listingId: string) => void;
}

export const UserListings = ({ listings, onListingDelete }: UserListingsProps) => {
  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);
      
      if (error) throw error;
      
      onListingDelete(listingId);
      
      toast({
        title: "Listing Deleted",
        description: "Your listing has been successfully removed."
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Listing",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">My Listings</h2>
      {listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(listing => (
            <Card key={listing.id} className="relative">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{listing.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 font-medium">{listing.price?.toFixed(2)} MAD</span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteListing(listing.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">You haven't created any listings yet.</p>
      )}
    </div>
  );
};
