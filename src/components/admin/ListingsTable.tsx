
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Lock, Unlock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ListingsTable() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (searchQuery) {
          query = query.ilike('title', `%${searchQuery}%`);
        }
        
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setListings(data);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchListings();
  }, [searchQuery, statusFilter]);
  
  const handleViewListing = (id: string) => {
    navigate(`/listing/${id}`);
  };
  
  const handleDeleteListing = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('listings')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        setListings(listings.filter(listing => listing.id !== id));
        toast({ title: 'Success', description: 'Listing deleted successfully' });
      } catch (error) {
        console.error('Error deleting listing:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to delete listing', 
          variant: 'destructive' 
        });
      }
    }
  };
  
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setListings(listings.map(listing => 
        listing.id === id ? { ...listing, status: newStatus } : listing
      ));
      
      toast({ 
        title: 'Success', 
        description: `Listing status updated to ${newStatus}` 
      });
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update listing status', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
      sold: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      reserved: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      removed: "bg-red-100 text-red-800 hover:bg-red-100",
    };
    
    return <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          
          <Select value={statusFilter || ''} onValueChange={(value) => setStatusFilter(value || null)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="rounded-md border bg-white">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading listings...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No listings found
                  </TableCell>
                </TableRow>
              ) : (
                listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.title}</TableCell>
                    <TableCell>{listing.category}</TableCell>
                    <TableCell>{listing.price ? `${listing.price} MAD` : 'Free'}</TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewListing(listing.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {listing.status === 'removed' ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            title="Restore"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(listing.id, 'removed')}
                            title="Deactivate"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteListing(listing.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
