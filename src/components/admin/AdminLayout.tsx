
import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { LayoutDashboard, UserRound, Package2, Settings } from 'lucide-react';

export function AdminLayout() {
  const { isAdmin } = useAdmin();
  const [stats, setStats] = useState({
    listings: 0,
    users: 0,
    removedListings: 0
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin) return;
      
      try {
        // Count total listings
        const listingsRes = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true });
        
        // Count total users
        const usersRes = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        // Count removed listings
        const removedRes = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'removed');
        
        setStats({
          listings: listingsRes.count || 0,
          users: usersRes.count || 0,
          removedListings: removedRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    fetchStats();
  }, [isAdmin]);
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/listings', label: 'Listings', icon: Package2 },
    { path: '/admin/users', label: 'Users', icon: UserRound },
    { path: '/admin/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-emerald-600 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="bg-white p-4 rounded-lg shadow">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => 
                  `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-2" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="px-4 space-y-4">
              <div>
                <span className="block text-xs font-medium text-gray-500">Total Listings</span>
                <span className="text-lg font-bold">{stats.listings}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500">Total Users</span>
                <span className="text-lg font-bold">{stats.users}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500">Removed Listings</span>
                <span className="text-lg font-bold">{stats.removedListings}</span>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main content area */}
        <div className="md:col-span-2 lg:col-span-3">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
