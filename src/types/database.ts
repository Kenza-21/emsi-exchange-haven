
export type Profile = {
  id: string;
  full_name: string | null;
  student_id: string | null;
  created_at: string;
  bio?: string | null;
};

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  category: string;
  condition: string;
  user_id: string;
  created_at: string;
  status: 'active' | 'sold' | 'reserved' | string;
};

export type Image = {
  id: string;
  listing_id: string;
  url: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string | null;
  lost_found_id: string | null; // Added this field
  content: string;
  created_at: string;
  read: boolean | null;
};

export type LostFound = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  found_date: string;
  user_id: string;
  image_url: string | null;
  status: 'found' | 'claimed' | string;
  created_at: string;
};

export const CATEGORIES = [
  'School Supplies',
  'Textbooks',
  'Electronics',
  'Clothing',
  'Furniture',
  'Other'
];

export const CONDITIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor'
];
