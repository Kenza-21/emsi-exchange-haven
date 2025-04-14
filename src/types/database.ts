
export type Profile = {
  id: string;
  full_name: string;
  student_id: string;
  created_at: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  user_id: string;
  created_at: string;
  status: 'active' | 'sold' | 'reserved';
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
  listing_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

export type LostFound = {
  id: string;
  title: string;
  description: string;
  location: string;
  found_date: string;
  user_id: string;
  image_url: string;
  status: 'found' | 'claimed';
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
