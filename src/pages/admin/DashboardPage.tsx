
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Package, ShoppingBag, AlertCircle } from 'lucide-react';
import { UsersTable } from '@/components/admin/UsersTable';
import { ListingsTable } from '@/components/admin/ListingsTable';

interface StatsData {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
}

interface CategoryData {
  name: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];

const AdminDashboard = () => {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        // Fetch listings stats
        const { data: listingsData } = await supabase
          .from('listings')
          .select('status');
        
        const totalListings = listingsData?.length || 0;
        const activeListings = listingsData?.filter(listing => listing.status === 'active').length || 0;
        const soldListings = listingsData?.filter(listing => listing.status === 'sold').length || 0;
        
        setStatsData({
          totalUsers: userCount || 0,
          totalListings,
          activeListings,
          soldListings
        });
        
        // Fetch category distribution
        const { data: categoriesData } = await supabase
          .from('listings')
          .select('category');
        
        if (categoriesData) {
          const categoryCount: Record<string, number> = {};
          categoriesData.forEach(listing => {
            const category = listing.category;
            if (category) {
              categoryCount[category] = (categoryCount[category] || 0) + 1;
            }
          });
          
          const formattedCategoryData = Object.entries(categoryCount).map(([name, count]) => ({
            name,
            count
          }));
          
          setCategoryData(formattedCategoryData);
        }
        
        // Fetch monthly activity
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
        
        const { data: monthlyListings } = await supabase
          .from('listings')
          .select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString());
          
        if (monthlyListings) {
          const monthlyData: Record<string, { month: string, listings: number, transactions: number }> = {};
          
          // Initialize months
          for (let i = 0; i <= 5; i++) {
            const date = new Date();
            date.setMonth(currentDate.getMonth() - i);
            const monthYear = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            monthlyData[monthYear] = { month: monthYear, listings: 0, transactions: 0 };
          }
          
          // Count listings by month
          monthlyListings.forEach(listing => {
            const date = new Date(listing.created_at);
            const monthYear = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            if (monthlyData[monthYear]) {
              monthlyData[monthYear].listings += 1;
            }
          });
          
          const formattedMonthlyData = Object.values(monthlyData).sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          });
          
          setActivityData(formattedMonthlyData);
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-lg">Loading dashboard data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-800">{statsData?.totalUsers}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Listings</p>
              <h3 className="text-2xl font-bold text-gray-800">{statsData?.totalListings}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="bg-amber-100 p-3 rounded-full">
              <ShoppingBag className="h-8 w-8 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Listings</p>
              <h3 className="text-2xl font-bold text-gray-800">{statsData?.activeListings}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Sold Items</p>
              <h3 className="text-2xl font-bold text-gray-800">{statsData?.soldListings}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Categories Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="count"
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} listings`, 'Count']}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="listings" fill="#8884d8" name="New Listings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Tables */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="listings">Listings Management</TabsTrigger>
          <TabsTrigger value="users">Users Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>All Listings</CardTitle>
              <CardDescription>
                Manage all listings on the platform. You can remove or deactivate listings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListingsTable />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage all users on the platform. You can block or edit user accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
