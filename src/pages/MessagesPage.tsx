
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { MessagesList } from '@/components/messages/MessagesList';

const MessagesPage = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>
      <MessagesList />
    </div>
  );
};

export default MessagesPage;
