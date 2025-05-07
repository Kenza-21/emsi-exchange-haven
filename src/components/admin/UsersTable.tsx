
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Ban, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function UsersTable() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (searchQuery) {
          query = query.or(`full_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [searchQuery]);
  
  const handleToggleBlock = async (userId: string, currentBlocked: boolean | null | undefined) => {
    const newBlockedStatus = !currentBlocked;
    const actionText = newBlockedStatus ? 'blocked' : 'unblocked';
    
    if (window.confirm(`Are you sure you want to ${actionText === 'blocked' ? 'block' : 'unblock'} this user?`)) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_blocked: newBlockedStatus })
          .eq('id', userId);
          
        if (error) throw error;
        
        setUsers(users.map(user => 
          user.id === userId ? { ...user, is_blocked: newBlockedStatus } : user
        ));
        
        toast({ 
          title: 'Success', 
          description: `User has been ${actionText}` 
        });
      } catch (error) {
        console.error(`Error ${actionText} user:`, error);
        toast({ 
          title: 'Error', 
          description: `Failed to ${actionText === 'blocked' ? 'block' : 'unblock'} user`, 
          variant: 'destructive' 
        });
      }
    }
  };
  
  const handleViewUser = (id: string) => {
    navigate(`/profile/${id}`);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <div className="rounded-md border bg-white">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.student_id || 'N/A'}</TableCell>
                    <TableCell>
                      {user.is_blocked ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Blocked</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewUser(user.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                          className={
                            user.is_blocked 
                              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          }
                        >
                          {user.is_blocked ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
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
