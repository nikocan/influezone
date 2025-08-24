import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border px-6 py-4 ml-64">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-bright">
            {user.role === 'influencer' && 'BenimDükkanım'}
            {user.role === 'brand' && 'InflueZone'}
            {user.role === 'admin' && 'Admin Panel'}
            {user.role === 'consumer' && 'Alışveriş'}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={20} />
            <input
              type="text"
              placeholder="Ara..."
              className="pl-10 pr-4 py-2 bg-input-bg border border-border text-text-primary placeholder-text-muted rounded-lg focus:outline-none focus:shadow-ring transition-all duration-200"
            />
          </div>

          <button className="relative p-2 text-text-secondary hover:text-bright hover:bg-hover rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-border">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover avatar-glow"
            />
            <div className="hidden md:block">
              <p className="text-sm font-medium text-bright">{user.name}</p>
              <p className="text-xs text-text-secondary capitalize">{user.role}</p>
            </div>
            
            <div className="flex items-center space-x-1">
              <ChevronDown size={16} className="text-text-muted" />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};