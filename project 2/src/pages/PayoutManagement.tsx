import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Transaction } from '../types';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Filter,
  Search,
  CreditCard,
  Building,
  AlertTriangle
} from 'lucide-react';

interface PayoutRequest extends Transaction {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  paymentMethod: 'bank' | 'paypal' | 'wise';
  paymentDetails: {
    bankName?: string;
    iban?: string;
    accountHolder?: string;
    paypalEmail?: string;
    wiseEmail?: string;
  };
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

const mockPayoutRequests: PayoutRequest[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Sarah Lifestyle',
    userEmail: 'sarah@example.com',
    userAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    type: 'payout',
    amount: 2500,
    status: 'pending',
    date: '2024-01-15',
    description: 'Komisyon ödemesi - Ocak 2024',
    paymentMethod: 'bank',
    paymentDetails: {
      bankName: 'Garanti BBVA',
      iban: 'TR33 0006 1005 1978 6457 8413 26',
      accountHolder: 'Sarah Lifestyle'
    },
    requestedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    userId: '2',
    userName: 'Tech Guru Ali',
    userEmail: 'ali@example.com',
    userAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face',
    type: 'payout',
    amount: 1800,
    status: 'completed',
    date: '2024-01-14',
    description: 'Komisyon ödemesi - Ocak 2024',
    paymentMethod: 'paypal',
    paymentDetails: {
      paypalEmail: 'ali@example.com'
    },
    requestedAt: '2024-01-14T14:20:00Z',
    processedAt: '2024-01-14T16:45:00Z',
    processedBy: 'admin_1'
  },
  {
    id: '3',
    userId: '3',
    userName: 'Fashion Zeynep',
    userEmail: 'zeynep@example.com',
    userAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face',
    type: 'payout',
    amount: 3200,
    status: 'failed',
    date: '2024-01-13',
    description: 'Komisyon ödemesi - Ocak 2024',
    paymentMethod: 'bank',
    paymentDetails: {
      bankName: 'İş Bankası',
      iban: 'TR64 0006 4000 0011 2345 6789 01',
      accountHolder: 'Zeynep Fashion'
    },
    requestedAt: '2024-01-13T09:15:00Z',
    processedAt: '2024-01-13T11:30:00Z',
    processedBy: 'admin_1',
    notes: 'IBAN bilgileri hatalı'
  },
  {
    id: '4',
    userId: '4',
    userName: 'Beauty Expert Ayşe',
    userEmail: 'ayse@example.com',
    userAvatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?w=150&h=150&fit=crop&crop=face',
    type: 'payout',
    amount: 950,
    status: 'pending',
    date: '2024-01-16',
    description: 'Komisyon ödemesi - Ocak 2024',
    paymentMethod: 'wise',
    paymentDetails: {
      wiseEmail: 'ayse@example.com'
    },
    requestedAt: '2024-01-16T13:45:00Z'
  }
];

export const PayoutManagement: React.FC = () => {
  const [payouts, setPayouts] = useState(mockPayoutRequests);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payout.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || payout.status === selectedStatus;
    const matchesMethod = !selectedMethod || payout.paymentMethod === selectedMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const handlePayoutAction = (payoutId: string, action: 'approve' | 'reject', notes?: string) => {
    setPayouts(prev => prev.map(payout => {
      if (payout.id === payoutId) {
        return {
          ...payout,
          status: action === 'approve' ? 'completed' : 'failed',
          processedAt: new Date().toISOString(),
          processedBy: 'current_admin',
          notes: notes || payout.notes
        };
      }
      return payout;
    }));
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    const selectedIds = Array.from(bulkSelected);
    selectedIds.forEach(id => {
      handlePayoutAction(id, action);
    });
    setBulkSelected(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success bg-success/10';
      case 'failed': return 'text-danger bg-danger/10';
      case 'pending': return 'text-warning bg-warning/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank': return Building;
      case 'paypal': return CreditCard;
      case 'wise': return Wallet;
      default: return CreditCard;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'bank': return 'text-info bg-info/10';
      case 'paypal': return 'text-brand-500 bg-brand-500/10';
      case 'wise': return 'text-accent-amber bg-accent-amber/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalCompleted = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const totalFailed = payouts.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-success to-info rounded-lg flex items-center justify-center">
            <Wallet className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Ödeme Yönetimi</h1>
            <p className="text-text-secondary">Influencer ödeme taleplerini yönet</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="text-warning" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Bekleyen</p>
                <p className="text-xl font-bold text-text-primary">₺{totalPending.toLocaleString()}</p>
                <p className="text-xs text-text-muted">{payouts.filter(p => p.status === 'pending').length} talep</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-success" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Tamamlanan</p>
                <p className="text-xl font-bold text-text-primary">₺{totalCompleted.toLocaleString()}</p>
                <p className="text-xs text-text-muted">{payouts.filter(p => p.status === 'completed').length} ödeme</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="text-danger" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Başarısız</p>
                <p className="text-xl font-bold text-text-primary">₺{totalFailed.toLocaleString()}</p>
                <p className="text-xs text-text-muted">{payouts.filter(p => p.status === 'failed').length} hata</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Wallet className="text-brand-500" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Toplam</p>
                <p className="text-xl font-bold text-text-primary">
                  ₺{(totalPending + totalCompleted + totalFailed).toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">{payouts.length} talep</p>
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
                placeholder="Kullanıcı ara..."
                className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-border text-text-primary placeholder-text-muted rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="completed">Tamamlandı</option>
              <option value="failed">Başarısız</option>
            </select>
            <select 
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Yöntemler</option>
              <option value="bank">Banka</option>
              <option value="paypal">PayPal</option>
              <option value="wise">Wise</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {bulkSelected.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">{bulkSelected.size} ödeme seçildi</span>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  onClick={() => handleBulkAction('approve')}
                  className="bg-success hover:bg-success/80"
                >
                  Toplu Onayla
                </Button>
                <Button 
                  size="sm" 
                  variant="danger" 
                  onClick={() => handleBulkAction('reject')}
                >
                  Toplu Reddet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Talepleri ({filteredPayouts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-4">
            {filteredPayouts.map((payout) => {
              const StatusIcon = getStatusIcon(payout.status);
              const MethodIcon = getMethodIcon(payout.paymentMethod);
              
              return (
                <div key={payout.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(payout.id)}
                        onChange={(e) => {
                          const newSelected = new Set(bulkSelected);
                          if (e.target.checked) {
                            newSelected.add(payout.id);
                          } else {
                            newSelected.delete(payout.id);
                          }
                          setBulkSelected(newSelected);
                        }}
                        className="rounded border-border"
                      />
                      
                      <img
                        src={payout.userAvatar}
                        alt={payout.userName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-text-primary">{payout.userName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                            <StatusIcon size={12} className="inline mr-1" />
                            {payout.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payout.paymentMethod)}`}>
                            <MethodIcon size={12} className="inline mr-1" />
                            {payout.paymentMethod}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm mb-1">{payout.userEmail}</p>
                        <div className="flex items-center space-x-4 text-sm text-text-muted">
                          <span>Talep: {new Date(payout.requestedAt).toLocaleDateString('tr-TR')}</span>
                          {payout.processedAt && (
                            <span>İşlem: {new Date(payout.processedAt).toLocaleDateString('tr-TR')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-text-primary">₺{payout.amount.toLocaleString()}</p>
                        <p className="text-sm text-text-secondary">{payout.description}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowDetailModal(true);
                          }}
                          className="px-3 py-1 bg-info/20 text-info rounded-lg text-sm hover:bg-info/30 transition-colors"
                        >
                          Detay
                        </button>
                        
                        {payout.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handlePayoutAction(payout.id, 'approve')}
                              className="bg-success hover:bg-success/80"
                            >
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handlePayoutAction(payout.id, 'reject', 'Admin tarafından reddedildi')}
                            >
                              Reddet
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {payout.notes && (
                    <div className="mt-3 p-3 bg-surface-1 rounded-lg border-l-4 border-warning">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle size={16} className="text-warning mt-0.5" />
                        <p className="text-sm text-text-primary">{payout.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedPayout && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ödeme Detayları</CardTitle>
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
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedPayout.userAvatar}
                    alt={selectedPayout.userName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{selectedPayout.userName}</h3>
                    <p className="text-text-secondary">{selectedPayout.userEmail}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayout.status)}`}>
                        {selectedPayout.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(selectedPayout.paymentMethod)}`}>
                        {selectedPayout.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Tutar</p>
                    <p className="text-2xl font-bold text-success">₺{selectedPayout.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Talep Tarihi</p>
                    <p className="font-medium text-text-primary">
                      {new Date(selectedPayout.requestedAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {selectedPayout.processedAt && (
                    <>
                      <div>
                        <p className="text-sm text-text-secondary">İşlem Tarihi</p>
                        <p className="font-medium text-text-primary">
                          {new Date(selectedPayout.processedAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">İşleyen</p>
                        <p className="font-medium text-text-primary">{selectedPayout.processedBy}</p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-text-primary mb-3">Ödeme Bilgileri</h4>
                  <div className="p-4 bg-surface-2 rounded-lg">
                    {selectedPayout.paymentMethod === 'bank' && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Banka:</span>
                          <span className="text-text-primary">{selectedPayout.paymentDetails.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">IBAN:</span>
                          <span className="text-text-primary font-mono">{selectedPayout.paymentDetails.iban}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Hesap Sahibi:</span>
                          <span className="text-text-primary">{selectedPayout.paymentDetails.accountHolder}</span>
                        </div>
                      </div>
                    )}
                    {selectedPayout.paymentMethod === 'paypal' && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">PayPal Email:</span>
                        <span className="text-text-primary">{selectedPayout.paymentDetails.paypalEmail}</span>
                      </div>
                    )}
                    {selectedPayout.paymentMethod === 'wise' && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Wise Email:</span>
                        <span className="text-text-primary">{selectedPayout.paymentDetails.wiseEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPayout.notes && (
                  <div>
                    <h4 className="font-semibold text-text-primary mb-2">Notlar</h4>
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-text-primary">{selectedPayout.notes}</p>
                    </div>
                  </div>
                )}

                {selectedPayout.status === 'pending' && (
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => {
                        handlePayoutAction(selectedPayout.id, 'approve');
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
                        handlePayoutAction(selectedPayout.id, 'reject', 'Admin tarafından reddedildi');
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