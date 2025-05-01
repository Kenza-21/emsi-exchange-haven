
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CreateLostFoundForm } from '@/components/lost-found/CreateLostFoundForm';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

const CreateLostFoundPage = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/lost-found" className="text-emerald-600 hover:underline flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lost & Found
        </Link>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Report Item</h1>
        <CreateLostFoundForm />
      </div>
    </div>
  );
};

export default CreateLostFoundPage;
