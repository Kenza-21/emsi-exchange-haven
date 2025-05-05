
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { CategoryFilter } from '@/components/listings/CategoryFilter';
import { useListings } from '@/hooks/useListings';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { listings, loading, error } = useListings(selectedCategory, searchQuery);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The useListings hook will fetch based on the searchQuery state
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero Section */}
      <div className="bg-emerald-600 text-white rounded-lg p-8 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            EMSI Exchange Hub
          </h1>
          <p className="text-lg mb-6">
            Buy and sell items with fellow EMSI students. From textbooks to electronics, find everything you need on campus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/create-listing">
              <Button className="bg-white text-emerald-600 hover:bg-gray-100 w-full sm:w-auto">
                Sell Something
              </Button>
            </Link>
            <Link to="/lost-found">
              <Button className="bg-white text-emerald-600 hover:bg-gray-100 w-full sm:w-auto">
                Lost & Found
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="bg-gray-800 hover:bg-gray-900">
            Search
          </Button>
        </form>
        
        <CategoryFilter onCategoryChange={setSelectedCategory} />
      </div>

      {/* Listings */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        {selectedCategory ? selectedCategory : 'Latest Listings'}
      </h2>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Failed to load listings: {error}
        </div>
      ) : (
        <ListingGrid listings={listings} isLoading={loading} />
      )}
    </div>
  );
};

export default HomePage;
