
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Home,
  MessageSquare,
  Search,
  PlusCircle,
  User,
  LogOut,
  AlertCircle,
  Shield
} from 'lucide-react';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import { isAdmin } from '@/lib/auth-helpers';

export function NavBar() {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [adminStatus, setAdminStatus] = useState(false);
  const navigate = useNavigate();
  // Use the useMessages hook to get unreadCount for the message badge
  const { unreadCount: messageUnreadCount } = useMessages();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminCheck = await isAdmin();
        setAdminStatus(adminCheck);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="bg-emerald-600 text-white shadow-md py-2 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">EMSIExchangeHub</span>
        </Link>
        
        {user && (
          <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-xs w-full">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-gray-800 py-1 rounded-l-md border-0"
              />
            </div>
            <Button type="submit" className="bg-gray-800 hover:bg-gray-900 rounded-l-none">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        )}
        
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <Link to="/" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <Home className="h-5 w-5 mb-1" />
                <span>Home</span>
              </Link>
              <Link to="/dashboard" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <Search className="h-5 w-5 mb-1" />
                <span>Dashboard</span>
              </Link>
              <Link to="/messages" className="hover:text-emerald-100 flex flex-col items-center text-xs relative">
                <MessageSquare className="h-5 w-5 mb-1" />
                {messageUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {messageUnreadCount}
                  </span>
                )}
                <span>Messages</span>
              </Link>
              <Link to="/lost-found" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <AlertCircle className="h-5 w-5 mb-1" />
                <span>Lost & Found</span>
              </Link>
              <Link to="/create-listing" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <PlusCircle className="h-5 w-5 mb-1" />
                <span>Sell</span>
              </Link>
              <Link to="/profile" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <User className="h-5 w-5 mb-1" />
                <span>Profile</span>
              </Link>
              {adminStatus && (
                <Link to="/admin" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                  <Shield className="h-5 w-5 mb-1" />
                  <span>Admin</span>
                </Link>
              )}
              <div className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <NotificationsDropdown />
                <span>Alerts</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="hover:text-emerald-100 flex flex-col items-center text-xs hover:bg-emerald-700"
              >
                <LogOut className="h-5 w-5 mb-1" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm" className="bg-white text-emerald-600 hover:bg-gray-100">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gray-800 text-white hover:bg-gray-900">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
