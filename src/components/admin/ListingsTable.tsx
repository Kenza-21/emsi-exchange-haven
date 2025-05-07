
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Ban, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Listing } from '@/types/database';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

interface ExtendedListing extends Listing {
  profiles: {
    full_name: string | null;
  };
}

export function ListingsTable() {
  const [listings, setListings] = useState<ExtendedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'deactivate' | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchListings();
  }, []);
  
  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setListings(data as ExtendedListing[]);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteListing = async () => {
    if (!selectedListingId) return;
    
    try {
      // Delete images first (foreign key constraint)
      await supabase
        .from('images')
        .delete()
        .eq('listing_id', selectedListingId);
      
      // Then delete the listing
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', selectedListingId);
      
      if (error) throw error;
      
      setListings(prevListings => 
        prevListings.filter(listing => listing.id !== selectedListingId)
      );
      
      toast({
        title: 'Success',
        description: 'Listing deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive'
      });
    } finally {
      setSelectedListingId(null);
      setActionType(null);
    }
  };
  
  const handleDeactivateListing = async () => {
    if (!selectedListingId) return;
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'inactive' })
        .eq('id', selectedListingId);
      
      if (error) throw error;
      
      setListings(prevListings => 
        prevListings.map(listing => 
          listing.id === selectedListingId 
            ? { ...listing, status: 'inactive' } 
            : listing
        )
      );
      
      toast({
        title: 'Success',
        description: 'Listing deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate listing',
        variant: 'destructive'
      });
    } finally {
      setSelectedListingId(null);
      setActionType(null);
    }
  };
  
  const handleViewListing = (id: string) => {
    navigate(`/listing/${id}`);
  };
  
  const filteredListings = listings.filter(listing => 
    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (listing.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (listing.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center mb-4">
        <Input
          placeholder="Search listings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No listings found
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium">{listing.title}</TableCell>
                  <TableCell>{listing.profiles.full_name || 'Unknown'}</TableCell>
                  <TableCell>{listing.category}</TableCell>
                  <TableCell>
                    {listing.price ? `${listing.price} MAD` : 'Free'}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      listing.status === 'active' ? 'bg-emerald-500' : 
                      listing.status === 'sold' ? 'bg-blue-500' :
                      listing.status === 'inactive' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }>
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(listing.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewListing(listing.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedListingId(listing.id);
                        setActionType('deactivate');
                      }}
                      disabled={listing.status === 'inactive'}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600"
                      onClick={() => {
                        setSelectedListingId(listing.id);
                        setActionType('delete');
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <AlertDialog 
        open={!!selectedListingId && actionType === 'delete'} 
        onOpenChange={() => {
          if (actionType === 'delete') {
            setSelectedListingId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteListing}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog 
        open={!!selectedListingId && actionType === 'deactivate'} 
        onOpenChange={() => {
          if (actionType === 'deactivate') {
            setSelectedListingId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this listing? It will no longer be visible to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateListing}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
