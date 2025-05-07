
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    activeListings: 0,
    soldListings: 0,
    totalTransactions: 0,
    totalRatings: 0
  });
  
  const [listingsByCategory, setListingsByCategory] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch basic stats
        const [
          { count: totalUsers },
          { count: totalListings },
          { count: activeListings },
          { count: soldListings },
          { count: totalTransactions },
          { count: totalRatings }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('listings').select('*', { count: 'exact', head: true }),
          supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
          supabase.from('transactions').select('*', { count: 'exact', head: true }),
          supabase.from('ratings').select('*', { count: 'exact', head: true })
        ]);
        
        setStats({
          totalUsers: totalUsers || 0,
          totalListings: totalListings || 0,
          activeListings: activeListings || 0,
          soldListings: soldListings || 0,
          totalTransactions: totalTransactions || 0,
          totalRatings: totalRatings || 0
        });
        
        // Fetch listings by category
        const { data: categoryData } = await supabase.from('listings')
          .select('category')
          .eq('status', 'active');
        
        if (categoryData) {
          const categories: Record<string, number> = {};
          
          categoryData.forEach(item => {
            const category = item.category;
            categories[category] = (categories[category] || 0) + 1;
          });
          
          const formattedData = Object.keys(categories).map(name => ({
            name,
            count: categories[name]
          }));
          
          setListingsByCategory(formattedData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
        <div className="col-span-full h-64 bg-gray-200 rounded-lg mt-4"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} description="Registered users" />
        <StatCard title="Total Listings" value={stats.totalListings} description="All listings" />
        <StatCard title="Active Listings" value={stats.activeListings} description="Currently available" />
        <StatCard title="Sold Listings" value={stats.soldListings} description="Successfully sold" />
        <StatCard title="Transactions" value={stats.totalTransactions} description="Completed transactions" />
        <StatCard title="Reviews" value={stats.totalRatings} description="User ratings submitted" />
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listings by Category</CardTitle>
          <CardDescription>Distribution of active listings by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={listingsByCategory}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
