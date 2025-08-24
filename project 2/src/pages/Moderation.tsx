import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Flag,
  MessageSquare,
  Package,
  Image,
  Video,
  Filter,
  Search
} from 'lucide-react';

interface ModerationItem {
  id: string;
  type: 'product' | 'campaign' | 'content' | 'comment';
  title: string;
  description: string;
  reportedBy: string;
  reportReason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  content?: {
    image?: string;
    text?: string;
  };
}

const mockModerationItems: ModerationItem[] = [
  {
    id: '1',
    type: 'product',
    title: 'Şüpheli Ürün Listesi',
    description: 'Sahte marka ürünü olabilir',
    reportedBy: 'system_auto',
    reportReason: 'Telif hakkı ihlali',
    status: 'pending',
    createdAt: '2024-01-15T10:30:00Z',
    priority: 'high',
    content: {
      image: 'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?w=300&h=300&fit=crop',
      text: 'Orijinal marka ürünü, %50 indirimli!'
    }
  },
  {
    id: '2',
    type: 'content',
    title: 'Uygunsuz İçerik',
    description: 'Topluluk kurallarına aykırı paylaşım',
    reportedBy: 'user_123',
    reportReason: 'Spam içerik',
    status: 'pending',
    createdAt: '2024-01-15T09:15:00Z',
    priority: 'medium',
    content: {
      text: 'Bu ürünü alın, çok ucuz! Link bio\'da!'
    }
  },
  {
    id: '3',
    type: 'campaign',
    title: 'Yanıltıcı Kampanya',
    description: 'Gerçek dışı iddialar içeriyor',
    reportedBy: 'moderator_ai',
    reportReason: 'Yanıltıcı reklam',
    status: 'approved',
    createdAt: '2024-01-14T16:45:00Z',
    priority: 'low'
  },
  {
    id: '4',
    type: 'comment',
    title: 'Nefret Söylemi',
    description: 'Kullanıcı yorumunda uygunsuz dil',
    reportedBy: 'user_456',
    reportReason: 'Hakaret',
    status: 'rejected',
    createdAt: '2024-01-14T14:20:00Z',
    priority: 'high',
    content: {
      text: 'Bu ürün berbat, para kaybı!'
    }
  }
];

export const Moderation: React.FC = () => {
  const [items, setItems] = useState(mockModerationItems);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || item.type === selectedType;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    const matchesPriority = !selectedPriority || item.priority === selectedPriority;
    
    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const handleModerationAction = (itemId: string, action: 'approve' | 'reject') => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item
    ));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return Package;
      case 'campaign': return Flag;
      case 'content': return Image;
      case 'comment': return MessageSquare;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-success bg-success/10';
      case 'rejected': return 'text-danger bg-danger/10';
      case 'pending': return 'text-warning bg-warning/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-danger bg-danger/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-success bg-success/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product': return 'text-brand-500 bg-brand-500/10';
      case 'campaign': return 'text-accent-amber bg-accent-amber/10';
      case 'content': return 'text-info bg-info/10';
      case 'comment': return 'text-accent-coral bg-accent-coral/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const pendingCount = items.filter(item => item.status === 'pending').length;
  const highPriorityCount = items.filter(item => item.priority === 'high' && item.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-warning to-danger rounded-lg flex items-center justify-center">
            <Shield className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Moderasyon</h1>
            <p className="text-text-secondary">İçerik ve kullanıcı moderasyonu</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-text-secondary">Bekleyen</p>
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary">Yüksek Öncelik</p>
            <p className="text-2xl font-bold text-danger">{highPriorityCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Package className="text-brand-500" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Ürünler</p>
                <p className="text-xl font-bold text-text-primary">
                  {items.filter(i => i.type === 'product').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Flag className="text-accent-amber" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Kampanyalar</p>
                <p className="text-xl font-bold text-text-primary">
                  {items.filter(i => i.type === 'campaign').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Image className="text-info" size={20} />
              <div>
                <p className="text-sm text-text-secondary">İçerikler</p>
                <p className="text-xl font-bold text-text-primary">
                  {items.filter(i => i.type === 'content').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="text-accent-coral" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Yorumlar</p>
                <p className="text-xl font-bold text-text-primary">
                  {items.filter(i => i.type === 'comment').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Moderasyon öğesi ara..."
                className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-border text-text-primary placeholder-text-muted rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Tipler</option>
              <option value="product">Ürün</option>
              <option value="campaign">Kampanya</option>
              <option value="content">İçerik</option>
              <option value="comment">Yorum</option>
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Öncelikler</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Items */}
      <Card>
        <CardHeader>
          <CardTitle>Moderasyon Öğeleri ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-4">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              
              return (
                <div key={item.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center">
                        <TypeIcon className="text-text-primary" size={20} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-text-primary">{item.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <p className="text-text-secondary mb-2">{item.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-text-muted">
                          <span>Rapor eden: {item.reportedBy}</span>
                          <span>Sebep: {item.reportReason}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        
                        {item.content?.text && (
                          <div className="mt-3 p-3 bg-surface-1 rounded-lg">
                            <p className="text-text-secondary text-sm">{item.content.text}</p>
                          </div>
                        )}
                      </div>
                      
                      {item.content?.image && (
                        <img
                          src={item.content.image}
                          alt="Content"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-text-secondary hover:text-info transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleModerationAction(item.id, 'approve')}
                            className="bg-success hover:bg-success/80"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleModerationAction(item.id, 'reject')}
                          >
                            <XCircle size={14} className="mr-1" />
                            Reddet
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Moderasyon Detayları</CardTitle>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedItem.type)}`}>
                    {selectedItem.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedItem.priority)}`}>
                    {selectedItem.priority} öncelik
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{selectedItem.title}</h3>
                  <p className="text-text-secondary">{selectedItem.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Rapor Eden</p>
                    <p className="font-medium text-text-primary">{selectedItem.reportedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Rapor Sebebi</p>
                    <p className="font-medium text-text-primary">{selectedItem.reportReason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Oluşturulma</p>
                    <p className="font-medium text-text-primary">
                      {new Date(selectedItem.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Tip</p>
                    <p className="font-medium text-text-primary">{selectedItem.type}</p>
                  </div>
                </div>

                {selectedItem.content && (
                  <div>
                    <h4 className="font-semibold text-text-primary mb-3">İçerik</h4>
                    {selectedItem.content.image && (
                      <img
                        src={selectedItem.content.image}
                        alt="Content"
                        className="w-full max-w-md rounded-lg mb-3"
                      />
                    )}
                    {selectedItem.content.text && (
                      <div className="p-4 bg-surface-2 rounded-lg">
                        <p className="text-text-primary">{selectedItem.content.text}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedItem.status === 'pending' && (
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => {
                        handleModerationAction(selectedItem.id, 'approve');
                        setShowDetailModal(false);
                      }}
                      className="bg-success hover:bg-success/80"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Onayla
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleModerationAction(selectedItem.id, 'reject');
                        setShowDetailModal(false);
                      }}
                    >
                      <XCircle size={16} className="mr-2" />
                      Reddet
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};