
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export function SettingsPanel() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    defaultValues: {
      adminUserEmail: ''
    }
  });
  
  const onSubmit = async (data: { adminUserEmail: string }) => {
    if (!data.adminUserEmail || !data.adminUserEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First get the user ID for the provided email
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email: data.adminUserEmail });
      
      if (userError) throw userError;
      
      if (!userData) {
        toast({
          title: 'User not found',
          description: 'No user exists with this email address',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Add the user to admin_users table
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ id: userData });
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Success',
        description: 'Admin user added successfully'
      });
      
      form.reset();
    } catch (error: any) {
      console.error('Error adding admin user:', error);
      
      // Handle duplicate key error more gracefully
      if (error.code === '23505') {
        toast({
          title: 'User is already an admin',
          description: 'This user already has admin privileges',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Add Admin User</CardTitle>
          <CardDescription>
            Grant administrative privileges to another user
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="adminUserEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the user you want to make an admin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? 'Processing...' : 'Add Admin'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>
              Your current user information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p className="text-sm text-gray-500 mt-2">
              To make yourself an admin, you need to insert your ID into the admin_users table manually.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
