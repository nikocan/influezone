import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { InfluencerProfile } from '../types';
import { Users, Search, Filter, Heart, MapPin, TrendingUp } from 'lucide-react';

const mockInfluencers: InfluencerProfile[] = [
  {
    id: '1',
    name: 'Sarah Lifestyle',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 125000,
    engagementRate: 4.8,
    category: 'Lifestyle',
    platform: 'Instagram',
    location: 'İstanbul, TR',
    matchScore: 94
  },
  {
    id: '2',
    name: 'Tech Guru Ali',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 89000,
    engagementRate: 6.2,
    category: 'Technology',
    platform: 'TikTok',
    location: 'Ankara, TR',
    matchScore: 87
  },
  {
    id: '3',
    name: 'Fashion Zeynep',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 234000,
    engagementRate: 3.9,
    category: 'Fashion',
    platform: 'Instagram',
    location: 'İzmir, TR',
    matchScore: 91
  },
  {
    id: '4',
    name: 'Fitness Coach Mert',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 67000,
    engagementRate: 7.1,
    category: 'Fitness',
    platform: 'YouTube',
    location: 'Bursa, TR',
    matchScore: 83
  }
];

export const InfluencerDiscovery: React.FC = () => {
  const [filters, setFilters] = useState({
    category: '',
    platform: '',
    minFollowers: '',
    location: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [savedInfluencers, setSavedInfluencers] = useState<Set<string>>(new Set());

  const toggleSave = (influencerId: string) => {
    const newSaved = new Set(savedInfluencers);
    if (newSaved.has(influencerId)) {
      newSaved.delete(influencerId);
    } else {
      newSaved.add(influencerId);
    }
    setSavedInfluencers(newSaved);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Influencer Keşfi</h1>
            <p className="text-gray-600">Kampanyanız için en uygun influencer'ları bulun</p>
          </div>
        </div>
        <Button variant="secondary">
          <Heart size={16} className="mr-2" />
          Shortlist ({savedInfluencers.size})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter size={20} />
            <span>Filtreler</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
              <select 
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tümü</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="fashion">Fashion</option>
                <option value="tech">Technology</option>
                <option value="fitness">Fitness</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select 
                value={filters.platform}
                onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tümü</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min. Takipçi</label>
              <select 
                value={filters.minFollowers}
                onChange={(e) => setFilters(prev => ({ ...prev, minFollowers: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tümü</option>
                <option value="10000">10K+</option>
                <option value="50000">50K+</option>
                <option value="100000">100K+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
              <select 
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tümü</option>
                <option value="istanbul">İstanbul</option>
                <option value="ankara">Ankara</option>
                <option value="izmir">İzmir</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Influencer ara..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockInfluencers.map((influencer) => (
          <Card key={influencer.id} hover>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={influencer.avatar}
                    alt={influencer.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{influencer.name}</h3>
                    <p className="text-sm text-gray-600">{influencer.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSave(influencer.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    savedInfluencers.has(influencer.id)
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                  }`}
                >
                  <Heart size={16} className={savedInfluencers.has(influencer.id) ? 'fill-current' : ''} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Platform</span>
                  <span className="text-sm font-medium text-gray-900">{influencer.platform}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Takipçi</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(influencer.followers / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Etkileşim</span>
                  <span className="text-sm font-medium text-gray-900">{influencer.engagementRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Konum</span>
                  <span className="text-sm text-gray-600 flex items-center">
                    <MapPin size={12} className="mr-1" />
                    {influencer.location}
                  </span>
                </div>
                
                {influencer.matchScore && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Uyum Skoru</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getMatchScoreColor(influencer.matchScore)}`}>
                      %{influencer.matchScore}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <Button size="sm" className="w-full">
                  Profili İncele
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  Kampanyaya Ekle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};