
import { supabase } from './supabase';

// Check if a user is an admin using the is_admin function in Supabase
export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Update a user's blocked status
export const updateUserBlockedStatus = async (
  userId: string, 
  isBlocked: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: isBlocked })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user blocked status:', error);
    return false;
  }
};

// Update a user's last active timestamp
export const updateUserLastActive = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user last active status:', error);
  }
};
