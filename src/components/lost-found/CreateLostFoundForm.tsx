
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload } from 'lucide-react';

export function CreateLostFoundForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foundDate, setFoundDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'found' | 'lost'>('found');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      let imageUrl = null;
      
      // Handle image upload first if available
      if (image) {
        // Upload the image
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('lost-found-images')
          .upload(filePath, image, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 50));
            }
          });
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('lost-found-images')
          .getPublicUrl(uploadData.path);
          
        imageUrl = publicUrlData.publicUrl;
        setUploadProgress(75);
      }
      
      // Create the lost & found item entry
      const { data: lostFound, error: itemError } = await supabase
        .from('lost_found')
        .insert([{
          title,
          description,
          found_date: foundDate,
          location,
          user_id: user.id,
          status,
          image_url: imageUrl
        }])
        .select()
        .single();
      
      if (itemError) throw itemError;
      
      setUploadProgress(100);
      
      toast({
        title: "Item Reported",
        description: `Your ${status} item has been reported successfully.`
      });
      
      navigate(`/lost-found/${lostFound.id}`);
    } catch (error: any) {
      console.error('Error creating lost & found item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to report item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-800">Report an Item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Status</Label>
            <RadioGroup value={status} onValueChange={(val) => setStatus(val as 'lost' | 'found')} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="found" id="found" />
                <Label htmlFor="found" className="cursor-pointer">Found Item</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lost" id="lost" />
                <Label htmlFor="lost" className="cursor-pointer">Lost Item</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief description of the item"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about the item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">
              {status === 'found' ? 'Date Found' : 'Date Lost'}
            </Label>
            <Input
              id="date"
              type="date"
              value={foundDate}
              onChange={(e) => setFoundDate(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Where did you find the item?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {image ? `Selected: ${image.name}` : 'Click to upload an image'}
              </p>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
          
          <CardFooter className="px-0 pt-4">
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
