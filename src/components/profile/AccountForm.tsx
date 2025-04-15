
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';

export const AccountForm = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<{
    fullName: string;
    studentId: string;
    bio: string;
  }>({
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      studentId: user?.user_metadata?.student_id || '',
      bio: user?.user_metadata?.bio || ''
    }
  });

  const onSubmit = async (data: {
    fullName: string;
    studentId: string;
    bio: string;
  }) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          student_id: data.studentId,
          bio: data.bio
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          student_id: data.studentId,
          bio: data.bio
        }
      });

      if (updateError) throw updateError;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter your student ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us a bit about yourself" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update Profile'}
        </Button>
      </form>
    </Form>
  );
};
