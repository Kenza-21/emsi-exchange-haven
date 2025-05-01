
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { PostsList } from '@/components/posts/PostsList';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types/database';
import { toast } from 'sonner';

const PostsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, profile:profiles(full_name)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setPosts(data as Post[]);
      } catch (error: any) {
        console.error('Error fetching posts:', error);
        toast({
          title: "Error",
          description: "Failed to load posts. Please try again."
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [refreshKey]);
  
  const handlePostCreated = () => {
    // Force refresh the posts list
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (authLoading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Campus Feed</h1>
      
      <div className="max-w-2xl mx-auto">
        <CreatePostForm onPostCreated={handlePostCreated} />
        <PostsList posts={posts} loading={loading} />
      </div>
    </div>
  );
};

export default PostsPage;
