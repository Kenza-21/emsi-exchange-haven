
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { updateUserBlockedStatus } from '@/lib/auth-helpers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserX, UserCheck, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

interface UserActivity {
  id: string;
  full_name: string | null;
  student_id: string | null;
  join_date: string;
  is_blocked: boolean | null;
  last_active: string | null;
  listings_count: number;
  lost_found_count: number;
  messages_sent: number;
  messages_received: number;
}

export function UserList() {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Query all profiles and calculate counts with a custom query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // For each profile, get the counts
      const usersWithActivity = await Promise.all(
        profiles.map(async (profile) => {
          // Get listings count
          const { count: listingsCount, error: listingsError } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get lost & found count
          const { count: lostFoundCount, error: lostFoundError } = await supabase
            .from('lost_found')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get sent messages count
          const { count: messagesSentCount, error: messagesSentError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id);

          // Get received messages count
          const { count: messagesReceivedCount, error: messagesReceivedError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', profile.id);

          if (listingsError || lostFoundError || messagesSentError || messagesReceivedError) {
            console.error('Error fetching user activity:', {
              listingsError,
              lostFoundError,
              messagesSentError,
              messagesReceivedError
            });
          }

          return {
            id: profile.id,
            full_name: profile.full_name,
            student_id: profile.student_id,
            join_date: profile.created_at,
            is_blocked: profile.is_blocked || false,
            last_active: profile.last_active || profile.created_at,
            listings_count: listingsCount || 0,
            lost_found_count: lostFoundCount || 0,
            messages_sent: messagesSentCount || 0,
            messages_received: messagesReceivedCount || 0
          };
        })
      );

      setUsers(usersWithActivity);
      setFilteredUsers(usersWithActivity);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...users];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        (user.full_name && user.full_name.toLowerCase().includes(query)) ||
        (user.student_id && user.student_id.toLowerCase().includes(query))
      );
    }
    
    // Activity filters
    switch (filterOption) {
      case 'blocked':
        result = result.filter(user => user.is_blocked);
        break;
      case 'active':
        result = result.filter(user => !user.is_blocked);
        break;
      case 'most-listings':
        result = [...result].sort((a, b) => b.listings_count - a.listings_count);
        break;
      case 'most-messages':
        result = [...result].sort((a, b) => 
          (b.messages_sent + b.messages_received) - (a.messages_sent + a.messages_received)
        );
        break;
      case 'inactive':
        // Sort by last_active (oldest first)
        result = [...result].sort((a, b) => 
          new Date(a.last_active || '').getTime() - new Date(b.last_active || '').getTime()
        );
        break;
      default:
        // Default sorting by join date (newest first)
        result = [...result].sort((a, b) => 
          new Date(b.join_date).getTime() - new Date(a.join_date).getTime()
        );
    }
    
    setFilteredUsers(result);
  }, [users, searchQuery, filterOption]);

  const handleToggleBlock = async (userId: string, currentBlockedStatus: boolean) => {
    const newStatus = !currentBlockedStatus;
    const success = await updateUserBlockedStatus(userId, newStatus);
    
    if (success) {
      // Update the local state
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, is_blocked: newStatus } : user
      );
      
      setUsers(updatedUsers);
      
      toast({
        title: 'Success',
        description: `User has been ${newStatus ? 'blocked' : 'unblocked'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: `Failed to ${newStatus ? 'block' : 'unblock'} user. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name or student ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter size={16} />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter Users</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setFilterOption('all')}>
              All Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterOption('active')}>
              Active Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterOption('blocked')}>
              Blocked Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setFilterOption('most-listings')}>
              Most Listings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterOption('most-messages')}>
              Most Messages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterOption('inactive')}>
              Least Active
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500">
                            ID: {user.student_id || 'No ID'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Joined {format(new Date(user.join_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline">{user.listings_count} listings</Badge>
                            <Badge variant="outline">{user.lost_found_count} lost items</Badge>
                          </div>
                          <div className="flex gap-2 items-center mt-1">
                            <Badge variant="outline">{user.messages_sent} sent</Badge>
                            <Badge variant="outline">{user.messages_received} received</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Last active: {formatDistanceToNow(new Date(user.last_active || user.join_date), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={user.is_blocked ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleBlock(user.id, !!user.is_blocked)}
                        >
                          {user.is_blocked ? (
                            <>
                              <UserCheck className="mr-1 h-4 w-4" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <UserX className="mr-1 h-4 w-4" />
                              Block
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Total: {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </p>
        </>
      )}
    </div>
  );
}
