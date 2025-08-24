import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MessageCircle, Users, Send, Smile, Paperclip, MoreVertical } from 'lucide-react';

const channels = [
  { id: '1', name: 'Genel Sohbet', members: 1247, active: true },
  { id: '2', name: 'Moda & Stil', members: 892, active: false },
  { id: '3', name: 'Teknoloji', members: 634, active: false },
  { id: '4', name: 'Beauty Tips', members: 789, active: false },
  { id: '5', name: 'İş Geliştirme', members: 456, active: false }
];

const messages = [
  {
    id: '1',
    user: 'Sarah Lifestyle',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    message: 'Yeni kış koleksiyonu çok başarılı gidiyor! Size de öneririm 🔥',
    timestamp: '2 dk önce',
    reactions: ['👍', '🔥', '💜']
  },
  {
    id: '2',
    user: 'Tech Guru Ali',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face',
    message: 'AI özelliklerini deneyen var mı? SmartMatch gerçekten çok iyi çalışıyor',
    timestamp: '5 dk önce',
    reactions: ['💯', '🤖']
  },
  {
    id: '3',
    user: 'Fashion Zeynep',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face',
    message: 'Bu hafta Instagram reach\'im %40 arttı. Platform algoritması değişmiş olabilir',
    timestamp: '8 dk önce',
    reactions: ['📈', '👏']
  },
  {
    id: '4',
    user: 'Beauty Expert Ayşe',
    avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?w=150&h=150&fit=crop&crop=face',
    message: 'Yeni müşteri kazanma stratejileri için blog yazısı hazırladım. Link bio\'da!',
    timestamp: '12 dk önce',
    reactions: ['🙌', '💡']
  }
];

export const CommunityChat: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState('1');
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle message sending
      setNewMessage('');
    }
  };

  const selectedChannelData = channels.find(c => c.id === selectedChannel);

  return (
    <div className="h-[calc(100vh-120px)] flex space-x-6">
      {/* Channel Sidebar */}
      <div className="w-80">
        <Card className="h-full bg-panel">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 channel-title">
              <MessageCircle className="text-purple-600" size={20} />
              <span>Topluluk Kanalları</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-hover transition-colors rounded-lg ${
                    selectedChannel === channel.id ? 'menu-item-active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${
                        selectedChannel === channel.id ? 'text-bright' : 'text-primary'
                      }`}>
                        # {channel.name}
                      </p>
                      <p className="text-sm text-secondary flex items-center">
                        <Users size={12} className="mr-1" />
                        {channel.members} üye
                      </p>
                    </div>
                    {channel.active && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        <Card className="h-full flex flex-col bg-card">
          {/* Chat Header */}
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="channel-title"># {selectedChannelData?.name}</CardTitle>
                <p className="text-sm text-secondary">
                  {selectedChannelData?.members} üye • {messages.length} mesaj bugün
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical size={16} />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3 group">
                <img
                  src={message.avatar}
                  alt={message.user}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 avatar-glow"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-bright">{message.user}</p>
                    <p className="message-meta">{message.timestamp}</p>
                  </div>
                  <p className="message-text break-words">{message.message}</p>
                  
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {message.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          className="px-2 py-1 bg-hover hover:bg-surface-2 rounded-full text-sm transition-all duration-200 emoji-hover"
                        >
                          {reaction}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>

          {/* Message Input */}
          <div className="border-t border-border p-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`# ${selectedChannelData?.name} kanalına mesaj yazın...`}
                  className="w-full px-4 py-3 bg-input-bg border border-border text-text-primary placeholder-text-muted rounded-lg focus:outline-none focus:shadow-ring pr-20 transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button className="p-1 text-text-muted hover:text-text-secondary transition-colors">
                    <Paperclip size={16} />
                  </button>
                  <button className="p-1 text-text-muted hover:text-text-secondary transition-colors">
                    <Smile size={16} />
                  </button>
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm" 
                className="bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};