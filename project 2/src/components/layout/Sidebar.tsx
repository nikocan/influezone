import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Link, 
  Wallet, 
  Sparkles, 
  BarChart3, 
  Trophy,
  MessageCircle,
  Users,
  Settings,
  ShoppingBag,
  Target,
  Brain,
  Zap,
  Shield,
  DollarSign
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  // Influencer Panel
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['influencer', 'brand', 'admin'] },
  { id: 'store-settings', label: 'Mağaza Ayarları', icon: Store, path: '/store-settings', roles: ['influencer'] },
  { id: 'catalog', label: 'Ürün Kataloğu', icon: Package, path: '/catalog', roles: ['influencer'] },
  { id: 'affiliate', label: 'Link & Kupon', icon: Link, path: '/affiliate', roles: ['influencer'] },
  { id: 'wallet', label: 'Cüzdan', icon: Wallet, path: '/wallet', roles: ['influencer'] },
  { id: 'creator-studio', label: 'Creator Studio', icon: Sparkles, path: '/creator-studio', roles: ['influencer'] },
  { id: 'insights', label: 'Insight360', icon: BarChart3, path: '/insights', roles: ['influencer', 'brand', 'admin'] },
  { id: 'gamification', label: 'Rozetler', icon: Trophy, path: '/gamification', roles: ['influencer'] },
  { id: 'community', label: 'Topluluk', icon: MessageCircle, path: '/community', roles: ['influencer'] },
  
  // Brand Panel
  { id: 'products', label: 'Ürün Yönetimi', icon: Package, path: '/products', roles: ['brand'] },
  { id: 'campaigns', label: 'Kampanyalar', icon: Target, path: '/campaigns', roles: ['brand'] },
  { id: 'discovery', label: 'Influencer Keşfi', icon: Users, path: '/discovery', roles: ['brand'] },
  { id: 'smartmatch', label: 'SmartMatch AI', icon: Brain, path: '/smartmatch', roles: ['brand'] },
  { id: 'adboost', label: 'AdBoost AI', icon: Zap, path: '/adboost', roles: ['brand'] },
  { id: 'affiliate-mgmt', label: 'Affiliate Yönetimi', icon: Link, path: '/affiliate-mgmt', roles: ['brand'] },
  { id: 'finance', label: 'Finans', icon: DollarSign, path: '/finance', roles: ['brand'] },
  
  // Admin Panel
  { id: 'user-mgmt', label: 'Kullanıcı Yönetimi', icon: Users, path: '/user-mgmt', roles: ['admin'] },
  { id: 'moderation', label: 'Moderasyon', icon: Shield, path: '/moderation', roles: ['admin'] },
  { id: 'commission', label: 'Komisyon Kuralları', icon: DollarSign, path: '/commission', roles: ['admin'] },
  { id: 'payout-mgmt', label: 'Ödeme Yönetimi', icon: Wallet, path: '/payout-mgmt', roles: ['admin'] },
  { id: 'security', label: 'Güvenlik & Uyum', icon: Shield, path: '/security', roles: ['admin'] },
  
  // Consumer
  { id: 'explore', label: 'Keşfet', icon: ShoppingBag, path: '/explore', roles: ['consumer'] },
  { id: 'orders', label: 'Siparişlerim', icon: Package, path: '/orders', roles: ['consumer'] },
  { id: 'loyalty', label: 'Sadakat Programı', icon: Trophy, path: '/loyalty', roles: ['consumer'] },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const { user } = useAuth();

  if (!user) return null;

  const filteredItems = sidebarItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-panel border-r border-border text-text-primary h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-glow">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold">InfluenceOS</span>
        </div>

        <div className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  isActive
                    ? 'menu-item-active'
                    : 'text-text-secondary hover:text-bright hover:bg-hover'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};