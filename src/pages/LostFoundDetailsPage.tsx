
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLostFound } from '@/hooks/useLostFound';
import { AlertCircle } from 'lucide-react';
import { ContactButton } from '@/components/lost-found/ContactButton';

const LostFoundDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { item, owner, loading, error } = useLostFound(id || '');
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <div className="bg-gray-100 animate-pulse rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !item) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-medium mb-2">Error loading item details</p>
          <p>{error || "Item not found"}</p>
          <Link to="/lost-found">
            <Button variant="outline" className="mt-4">
              Back to Lost & Found
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Link to="/lost-found">
        <Button variant="outline" className="mb-6">
          Back to All Items
        </Button>
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full ${
                  item.status === 'found' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : item.status === 'claimed' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  {item.status === 'found' ? 'Found' : item.status === 'claimed' ? 'Claimed' : 'Lost'}
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {item.description || "No description provided."}
                </p>
              </div>
              
              {item.location && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Location Found</h2>
                  <p className="text-gray-700">{item.location}</p>
                </div>
              )}
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Date Found</h2>
                <p className="text-gray-700">
                  {new Date(item.found_date).toLocaleDateString()}
                </p>
              </div>
              
              {item.image_url && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold mb-2">Item Photo</h2>
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="rounded-lg w-full max-w-lg object-cover" 
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Finder Information</h2>
            {owner ? (
              <div>
                <p className="font-medium">{owner.full_name}</p>
                <p className="text-sm text-gray-600 mb-6">EMSI Student</p>
                
                <ContactButton 
                  owner={owner} 
                  itemId={item.id} 
                  itemTitle={item.title} 
                />
              </div>
            ) : (
              <p className="text-gray-500">Finder information not available</p>
            )}
            
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="text-blue-500 h-5 w-5 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-blue-800">Item Claim Process</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    To claim this item, please contact the finder directly through the message system.
                    You'll need to provide details to verify that the item belongs to you.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LostFoundDetailsPage;
