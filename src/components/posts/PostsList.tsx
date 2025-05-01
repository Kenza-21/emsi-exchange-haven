
import React from 'react';
import { Post } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostsListProps {
  posts: Post[];
  loading: boolean;
}

export const PostsList: React.FC<PostsListProps> = ({ posts, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="h-12 w-12 rounded-full bg-gray-200"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Add an extra safety check to ensure posts is an array
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar>
              <AvatarFallback>
                {post.profile && post.profile.full_name 
                  ? post.profile.full_name[0].toUpperCase() 
                  : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{post.profile?.full_name || 'Unknown User'}</h3>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{post.content}</p>
            {post.image_url && (
              <div className="mt-3">
                <img 
                  src={post.image_url} 
                  alt="Post attachment" 
                  className="rounded-md max-h-96 w-auto object-contain"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" className="text-gray-600">
                <Heart className="h-4 w-4 mr-1" />
                Like
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <MessageCircle className="h-4 w-4 mr-1" />
                Comment
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
