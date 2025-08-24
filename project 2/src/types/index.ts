export interface User {
  id: string;
  name: string;
  email: string;
  role: 'influencer' | 'brand' | 'admin' | 'consumer';
  avatar?: string;
  verified?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  stock: number;
  description: string;
}

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  status: 'draft' | 'live' | 'ended';
  budget: number;
  startDate: string;
  endDate: string;
  products: Product[];
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

export interface InfluencerProfile {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  engagementRate: number;
  category: string;
  platform: string;
  location: string;
  matchScore?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'payout' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  description: string;
}