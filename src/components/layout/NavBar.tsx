
import { Link } from 'react-router-dom';
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
  UserPlus
} from 'lucide-react';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

export function NavBar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-emerald-600 text-white shadow-md py-2 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">EMSIExchangeHub</span>
        </Link>
        
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <Link to="/" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <Home className="h-5 w-5 mb-1" />
                <span>Home</span>
              </Link>
              <Link to="/messages" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <MessageSquare className="h-5 w-5 mb-1" />
                <span>Messages</span>
              </Link>
              <Link to="/friends" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <UserPlus className="h-5 w-5 mb-1" />
                <span>Friends</span>
              </Link>
              <Link to="/search" className="hover:text-emerald-100 flex flex-col items-center text-xs">
                <Search className="h-5 w-5 mb-1" />
                <span>Search</span>
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
}
