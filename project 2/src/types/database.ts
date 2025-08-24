// Database schema types based on CSV files
export interface Allocation {
  id: string;
  campaign: string; // link to campaign
  user: string; // link to user
  task_type: 'content_creation' | 'promotion' | 'review' | 'engagement';
  qty: number;
  pace_profile: 'slow' | 'medium' | 'fast' | 'burst';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  daily_cap: number;
  cooldown_sec: number;
  created_at?: string;
  updated_at?: string;
}

export interface Appeal {
  id: string;
  task: string; // link to task/allocation
  user: string; // link to user
  evidence: string; // URL or text evidence
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  moderator?: string; // link to moderator user
  created_at?: string;
  resolved_at?: string;
  resolution_note?: string;
}

export interface Campaign {
  campaign_id: string;
  brand_name: string;
  country: string;
  niche: string;
  task_mix: string; // JSON string of task distribution
  budget_usd: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  created_at?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  requirements?: string;
}

export interface LedgerEntry {
  entry_id: string;
  user: string; // link to user
  task: string; // link to task/allocation
  campaign: string; // link to campaign
  type: 'earning' | 'bonus' | 'penalty' | 'refund' | 'fee';
  level: 'user' | 'campaign' | 'system';
  amount_usd: number;
  status: 'pending' | 'confirmed' | 'disputed' | 'cancelled';
  note?: string;
  created_time: string;
  processed_time?: string;
}

export interface Payout {
  id: string;
  user: string; // link to user
  method: 'bank_transfer' | 'paypal' | 'wise' | 'crypto' | 'check';
  amount_usd: number;
  fee_usd: number;
  status: 'requested' | 'processing' | 'completed' | 'failed' | 'cancelled';
  evidence?: string; // transaction ID or proof
  requested_at?: string;
  processed_at?: string;
  failure_reason?: string;
}

// Extended types for UI
export interface CampaignWithStats extends Campaign {
  total_allocations: number;
  active_users: number;
  completion_rate: number;
  total_spent: number;
  remaining_budget: number;
}

export interface UserWithStats {
  id: string;
  name: string;
  email: string;
  role: 'influencer' | 'brand' | 'admin' | 'consumer';
  avatar?: string;
  verified?: boolean;
  total_earnings: number;
  pending_earnings: number;
  completed_tasks: number;
  success_rate: number;
  join_date: string;
  last_active: string;
}

export interface TaskAllocation extends Allocation {
  campaign_name: string;
  user_name: string;
  user_avatar?: string;
  progress: number;
  earnings_to_date: number;
  last_activity?: string;
}

export interface PayoutWithUser extends Payout {
  user_name: string;
  user_email: string;
  user_avatar?: string;
  payment_details?: {
    bank_name?: string;
    iban?: string;
    account_holder?: string;
    paypal_email?: string;
    wise_email?: string;
  };
}