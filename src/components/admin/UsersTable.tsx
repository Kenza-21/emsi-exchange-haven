
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Ban, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { AdminUser } from '@/types/database';

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      
      // Now fetch which users are blocked
      const { data: blockedData } = await supabase
        .from('admin_users')
        .select('user_id, is_blocked');
      
      // Create a map of blocked status
      const blockedMap: Record<string, boolean> = {};
      blockedData?.forEach(item => {
        blockedMap[item.user_id] = item.is_blocked;
      });
      
      // Map to include blocked status
      const usersWithBlockedStatus = profiles.map(profile => ({
        ...profile,
        is_blocked: blockedMap[profile.id] || false,
        is_admin: false
      }));
      
      setUsers(usersWithBlockedStatus as AdminUser[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleBlockUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Check if entry exists in admin_users
      const { data: existingEntry } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', selectedUser.id)
        .single();
      
      if (existingEntry) {
        // Update existing entry
        await supabase
          .from('admin_users')
          .update({ is_blocked: !selectedUser.is_blocked })
          .eq('user_id', selectedUser.id);
      } else {
        // Insert new entry
        await supabase
          .from('admin_users')
          .insert({ 
            user_id: selectedUser.id, 
            is_blocked: true,
            is_admin: false
          });
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { ...user, is_blocked: !user.is_blocked } 
            : user
        )
      );
      
      toast({
        title: 'Success',
        description: selectedUser.is_blocked 
          ? `${selectedUser.full_name} has been unblocked` 
          : `${selectedUser.full_name} has been blocked`
      });
    } catch (error) {
      console.error('Error toggling user block status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    } finally {
      setSelectedUser(null);
      setIsBlockDialogOpen(false);
    }
  };
  
  const handleToggleAdminStatus = async (user: AdminUser) => {
    try {
      // Check if entry exists in admin_users
      const { data: existingEntry } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existingEntry) {
        // Update existing entry
        await supabase
          .from('admin_users')
          .update({ is_admin: !user.is_admin })
          .eq('user_id', user.id);
      } else {
        // Insert new entry
        await supabase
          .from('admin_users')
          .insert({ 
            user_id: user.id, 
            is_blocked: false,
            is_admin: true
          });
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id 
            ? { ...u, is_admin: !u.is_admin } 
            : u
        )
      );
      
      toast({
        title: 'Success',
        description: user.is_admin 
          ? `${user.full_name} is no longer an admin` 
          : `${user.full_name} is now an admin`
      });
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive'
      });
    }
  };
  
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center mb-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.is_blocked ? 'bg-red-50' : ''}>
                  <TableCell className="font-medium">
                    {user.full_name || 'Unnamed User'}
                  </TableCell>
                  <TableCell>{user.student_id || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`admin-${user.id}`}
                        checked={user.is_admin}
                        onCheckedChange={() => handleToggleAdminStatus(user)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <span className="flex items-center text-red-600">
                        <Ban className="h-4 w-4 mr-1" />
                        Blocked
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsBlockDialogOpen(true);
                      }}
                      className={user.is_blocked ? "text-green-600" : "text-red-600"}
                    >
                      {user.is_blocked ? 'Unblock' : 'Block'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <AlertDialog 
        open={isBlockDialogOpen} 
        onOpenChange={setIsBlockDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_blocked ? 'Unblock User' : 'Block User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_blocked 
                ? `Are you sure you want to unblock ${selectedUser?.full_name}?` 
                : `Are you sure you want to block ${selectedUser?.full_name}? They will not be able to access the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser}
              className={selectedUser?.is_blocked ? "" : "bg-red-600 hover:bg-red-700"}
            >
              {selectedUser?.is_blocked ? 'Unblock' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
