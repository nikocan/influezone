import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Brain, Star, TrendingUp, Target, Zap } from 'lucide-react';

const aiRecommendations = [
  {
    influencer: 'Sarah Lifestyle',
    matchScore: 94,
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    reasons: ['Hedef kitle uyumu %89', 'Kozmetik deneyimi', 'Yüksek etkileşim'],
    estimatedSales: 15600,
    estimatedROAS: 4.2,
    followers: 125000,
    engagementRate: 4.8
  },
  {
    influencer: 'Fashion Zeynep',
    matchScore: 91,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face',
    reasons: ['Moda expertise', 'Genç hedef kitle', 'Story engagement'],
    estimatedSales: 12400,
    estimatedROAS: 3.8,
    followers: 234000,
    engagementRate: 3.9
  },
  {
    influencer: 'Beauty Expert Ayşe',
    matchScore: 88,
    avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?w=150&h=150&fit=crop&crop=face',
    reasons: ['Güzellik kategorisi', 'Video içerik', 'Marka sadakati'],
    estimatedSales: 9800,
    estimatedROAS: 3.4,
    followers: 78000,
    engagementRate: 5.6
  }
];

export const SmartMatch: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Brain className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SmartMatch AI</h1>
          <p className="text-gray-600">AI destekli influencer eşleştirme ve tahmin</p>
        </div>
      </div>

      {/* Campaign Context */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif Kampanya: "Kış Koleksiyonu 2025"</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-900">Kategori</p>
              <p className="text-purple-700">Moda & Aksesuar</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-900">Bütçe</p>
              <p className="text-orange-700">₺25,000</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">Hedef Kitle</p>
              <p className="text-green-700">18-35 Kadın</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Süre</p>
              <p className="text-blue-700">15 Gün</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {aiRecommendations.map((rec, index) => (
          <Card key={rec.influencer} hover className="relative overflow-hidden">
            {/* Match Score Badge */}
            <div className="absolute top-4 right-4 z-10">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                rec.matchScore >= 90 ? 'bg-green-100 text-green-800' :
                rec.matchScore >= 85 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                %{rec.matchScore} Uyum
              </div>
            </div>

            <CardContent className="p-6">
              {/* Profile */}
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={rec.avatar}
                  alt={rec.influencer}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <div>
                  <h3 className="font-bold text-gray-900">{rec.influencer}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{(rec.followers / 1000).toFixed(0)}K takipçi</span>
                    <span>{rec.engagementRate}% ER</span>
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Neden Uygun?</h4>
                <div className="space-y-1">
                  {rec.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Star size={12} className="text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictions */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-900">Tahmini Satış</span>
                  </div>
                  <span className="font-bold text-green-900">₺{rec.estimatedSales.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Target size={16} className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Beklenen ROAS</span>
                  </div>
                  <span className="font-bold text-purple-900">{rec.estimatedROAS}x</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button size="sm" className="w-full">
                  <Zap size={14} className="mr-2" />
                  Kampanyaya Ekle
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  Profili İncele
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* A/B Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Shortlist Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Shortlist A (3 Influencer)</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Toplam Takipçi</p>
                    <p className="font-bold text-gray-900">487K</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ortalama ER</p>
                    <p className="font-bold text-gray-900">4.9%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tahmini Satış</p>
                    <p className="font-bold text-green-600">₺37,800</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Beklenen ROAS</p>
                    <p className="font-bold text-purple-600">3.8x</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Shortlist B (2 Influencer)</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Toplam Takipçi</p>
                    <p className="font-bold text-gray-900">312K</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ortalama ER</p>
                    <p className="font-bold text-gray-900">6.1%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tahmini Satış</p>
                    <p className="font-bold text-green-600">₺28,200</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Beklenen ROAS</p>
                    <p className="font-bold text-purple-600">4.1x</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};