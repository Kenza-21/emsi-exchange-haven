
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle } from 'lucide-react';
import { Post } from '@/types/database';

export function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Modified query to use proper join syntax
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profile:profiles(full_name)
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Type cast to ensure compatibility
        const typedPosts = data?.map(post => {
          return {
            ...post,
            profile: post.profile && typeof post.profile === 'object' && !('error' in post.profile)
              ? post.profile
              : { full_name: null }
          } as Post;
        }) || [];
        
        setPosts(typedPosts);
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
      }, () => {
        fetchPosts();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-48 w-full mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        Error loading posts: {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No posts yet. Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <Card key={post.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-10 w-10 bg-emerald-100 text-emerald-800">
                <AvatarFallback>
                  {post.profile?.full_name?.[0]?.toUpperCase() || <UserCircle />}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="font-medium">{post.profile?.full_name || 'Anonymous'}</h3>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <p className="whitespace-pre-line mb-3">{post.content}</p>
            
            {post.image_url && (
              <div className="mt-2">
                <img 
                  src={post.image_url} 
                  alt="Post attachment" 
                  className="rounded-md max-h-96 w-full object-contain bg-gray-50"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
