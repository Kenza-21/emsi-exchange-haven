
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMutation } from '@tanstack/react-query';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Use the is_admin() function we created in the database
        const { data, error: fnError } = await supabase.rpc('is_admin');
        
        if (fnError) {
          throw fnError;
        }
        
        setIsAdmin(!!data);
      } catch (err: any) {
        console.error('Error checking admin status:', err);
        setError(err.message);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Mutation to get user ID by email
  const getUserIdByEmail = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('get_user_id_by_email', {
        body: { email }
      });
      
      if (error) throw new Error(error.message);
      return data.id;
    }
  });

  return { isAdmin, loading, error, getUserIdByEmail };
}
