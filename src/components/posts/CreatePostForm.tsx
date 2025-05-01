
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image } from 'lucide-react';

export function CreatePostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user } = useAuth();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    
    // Create preview URL
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    
    setIsLoading(true);
    
    try {
      let imageUrl = null;
      
      // Handle image upload if available
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('items')
          .upload(filePath, image, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('items')
          .getPublicUrl(uploadData.path);
          
        imageUrl = publicUrlData.publicUrl;
      }
      
      // Create the post
      const { error } = await supabase
        .from('posts')
        .insert({
          content,
          image_url: imageUrl,
          user_id: user.id
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your post has been published",
      });
      
      // Clear form
      setContent('');
      removeImage();
      
      // Notify parent component
      if (onPostCreated) onPostCreated();
      
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to publish post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none"
              required
            />
          </div>
          
          {previewUrl && (
            <div className="relative mb-3">
              <img src={previewUrl} alt="Preview" className="max-h-60 rounded-md object-contain w-full" />
              <button 
                type="button"
                onClick={removeImage} 
                className="absolute top-2 right-2 p-1 bg-gray-800 bg-opacity-70 text-white rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="mr-2"
                onClick={() => document.getElementById('post-image')?.click()}
              >
                <Image className="h-4 w-4 mr-1" />
                <span>Add Image</span>
                <input
                  id="post-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </Button>
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading || !content.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
