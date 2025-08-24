import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Achievement } from '../types';
import { Trophy, Star, Target, Zap, Gift, Crown, Medal, Award } from 'lucide-react';

const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'İlk Satış',
    description: 'İlk satışınızı gerçekleştirin',
    icon: 'target',
    unlocked: true
  },
  {
    id: '2',
    name: 'Viral Gönderi',
    description: '10K+ beğeni alan gönderi paylaşın',
    icon: 'zap',
    unlocked: true
  },
  {
    id: '3',
    name: 'Süper Satıcı',
    description: 'Bir ayda 50+ satış yapın',
    icon: 'crown',
    unlocked: false,
    progress: 34,
    maxProgress: 50
  },
  {
    id: '4',
    name: 'Topluluk Lideri',
    description: '100+ yorum alın',
    icon: 'medal',
    unlocked: false,
    progress: 67,
    maxProgress: 100
  },
  {
    id: '5',
    name: 'Sadık Partner',
    description: '6 ay kesintisiz aktif olun',
    icon: 'award',
    unlocked: false,
    progress: 4,
    maxProgress: 6
  },
  {
    id: '6',
    name: 'Influencer Pro',
    description: '₺10,000+ toplam gelir elde edin',
    icon: 'gift',
    unlocked: false,
    progress: 7200,
    maxProgress: 10000
  }
];

const leaderboard = [
  { rank: 1, name: 'Sarah Lifestyle', points: 8450, change: '+2' },
  { rank: 2, name: 'Fashion Zeynep', points: 7920, change: '0' },
  { rank: 3, name: 'Tech Guru Ali', points: 7340, change: '-1' },
  { rank: 4, name: 'Beauty Expert Ayşe', points: 6890, change: '+1' },
  { rank: 5, name: 'Fitness Coach Mert', points: 6250, change: '+3' }
];

const iconMap = {
  target: Target,
  zap: Zap,
  crown: Crown,
  medal: Medal,
  award: Award,
  gift: Gift
};

export const Gamification: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
          <Trophy className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rozetler & Liderlik</h1>
          <p className="text-gray-600">Başarılarınızı takip edin ve topluluktaki yerinizi görün</p>
        </div>
      </div>

      {/* Current Level */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Seviye 12 - Altın Influencer</h3>
                <p className="text-gray-600">Bir sonraki seviyeye 850 puan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">8,450</p>
              <p className="text-sm text-gray-600">Toplam Puan</p>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: '78%' }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Seviye 12</span>
            <span>78% tamamlandı</span>
            <span>Seviye 13</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Medal className="text-yellow-500" size={20} />
              <span>Rozetler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mockAchievements.map((achievement) => {
                const IconComponent = iconMap[achievement.icon as keyof typeof iconMap];
                
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {achievement.unlocked && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Star size={12} className="text-white fill-current" />
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        achievement.unlocked
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <IconComponent size={20} />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className={`font-semibold ${
                          achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {achievement.name}
                        </h4>
                        <p className={`text-sm ${
                          achievement.unlocked ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {achievement.description}
                        </p>
                        
                        {achievement.progress !== undefined && achievement.maxProgress && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{achievement.progress}</span>
                              <span>{achievement.maxProgress}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="text-orange-500" size={20} />
              <span>Bu Ay'ın Liderleri</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div
                  key={user.rank}
                  className={`flex items-center space-x-4 p-3 rounded-lg transition-all duration-200 ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {user.rank}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.points.toLocaleString()} puan</p>
                  </div>
                  
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    user.change.startsWith('+') ? 'bg-green-100 text-green-800' :
                    user.change.startsWith('-') ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.change !== '0' && user.change}
                    {user.change === '0' && '→'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};