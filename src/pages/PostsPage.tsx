
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { PostsList } from '@/components/posts/PostsList';
import { useState } from 'react';

const PostsPage = () => {
  const { user, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handlePostCreated = () => {
    // Force refresh the posts list
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (loading) {
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
        <PostsList key={refreshKey} />
      </div>
    </div>
  );
};

export default PostsPage;
