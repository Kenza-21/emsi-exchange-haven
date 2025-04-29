
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
        );
        
        // Update unread count
        setUnreadCount(prev => {
          const wasRead = payload.old.read;
          const isRead = payload.new.read;
          if (!wasRead && isRead) return prev - 1;
          if (wasRead && !isRead) return prev + 1;
          return prev;
        });
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
        
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  return { 
    notifications, 
    unreadCount,
    loading, 
    error,
    markAsRead,
    markAllAsRead
  };
}
