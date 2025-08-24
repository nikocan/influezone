import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Shield, 
  Lock, 
  Eye, 
  Download, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  User,
  Database,
  Activity
} from 'lucide-react';

interface SecurityLog {
  id: string;
  type: 'login' | 'access' | 'data_request' | 'data_deletion' | 'consent' | 'breach';
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failed' | 'pending';
}

interface DataRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  reason?: string;
  dataTypes: string[];
}

interface ConsentRecord {
  id: string;
  userId: string;
  userName: string;
  consentType: 'marketing' | 'analytics' | 'cookies' | 'data_processing';
  status: 'granted' | 'withdrawn';
  timestamp: string;
  ipAddress: string;
  version: string;
}

const mockSecurityLogs: SecurityLog[] = [
  {
    id: '1',
    type: 'login',
    userId: '1',
    userName: 'Sarah Lifestyle',
    action: 'Başarılı giriş',
    details: 'Normal giriş işlemi',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: '2024-01-15T10:30:00Z',
    severity: 'low',
    status: 'success'
  },
  {
    id: '2',
    type: 'access',
    userId: '2',
    userName: 'Admin User',
    action: 'PII verilerine erişim',
    details: 'Kullanıcı detay sayfası görüntülendi',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2024-01-15T09:15:00Z',
    severity: 'medium',
    status: 'success'
  },
  {
    id: '3',
    type: 'login',
    userId: '3',
    userName: 'Unknown',
    action: 'Başarısız giriş denemesi',
    details: 'Yanlış şifre - 5. deneme',
    ipAddress: '203.0.113.45',
    userAgent: 'curl/7.68.0',
    timestamp: '2024-01-15T08:45:00Z',
    severity: 'high',
    status: 'failed'
  }
];

const mockDataRequests: DataRequest[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Sarah Lifestyle',
    userEmail: 'sarah@example.com',
    type: 'export',
    status: 'completed',
    requestedAt: '2024-01-14T14:20:00Z',
    completedAt: '2024-01-14T16:30:00Z',
    dataTypes: ['profile', 'transactions', 'content']
  },
  {
    id: '2',
    userId: '2',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    type: 'deletion',
    status: 'pending',
    requestedAt: '2024-01-15T11:45:00Z',
    reason: 'GDPR Article 17 - Right to erasure',
    dataTypes: ['profile', 'transactions', 'messages', 'analytics']
  }
];

const mockConsentRecords: ConsentRecord[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Sarah Lifestyle',
    consentType: 'marketing',
    status: 'granted',
    timestamp: '2024-01-10T12:00:00Z',
    ipAddress: '192.168.1.100',
    version: 'v2.1'
  },
  {
    id: '2',
    userId: '1',
    userName: 'Sarah Lifestyle',
    consentType: 'analytics',
    status: 'withdrawn',
    timestamp: '2024-01-12T15:30:00Z',
    ipAddress: '192.168.1.100',
    version: 'v2.1'
  }
];

export const SecurityCompliance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'data_requests' | 'consent'>('logs');
  const [securityLogs] = useState(mockSecurityLogs);
  const [dataRequests, setDataRequests] = useState(mockDataRequests);
  const [consentRecords] = useState(mockConsentRecords);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  const handleDataRequestAction = (requestId: string, action: 'approve' | 'reject') => {
    setDataRequests(prev => prev.map(request => {
      if (request.id === requestId) {
        return {
          ...request,
          status: action === 'approve' ? 'processing' : 'failed',
          completedAt: action === 'approve' ? undefined : new Date().toISOString()
        };
      }
      return request;
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-danger bg-danger/10 border-danger/20';
      case 'high': return 'text-warning bg-warning/10 border-warning/20';
      case 'medium': return 'text-info bg-info/10 border-info/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': case 'completed': case 'granted': return 'text-success bg-success/10';
      case 'failed': case 'withdrawn': return 'text-danger bg-danger/10';
      case 'pending': case 'processing': return 'text-warning bg-warning/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return Lock;
      case 'access': return Eye;
      case 'data_request': return Database;
      case 'data_deletion': return Trash2;
      case 'consent': return FileText;
      case 'breach': return AlertTriangle;
      default: return Activity;
    }
  };

  const criticalCount = securityLogs.filter(log => log.severity === 'critical').length;
  const highCount = securityLogs.filter(log => log.severity === 'high').length;
  const pendingRequests = dataRequests.filter(req => req.status === 'pending').length;
  const activeConsents = consentRecords.filter(rec => rec.status === 'granted').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-danger to-warning rounded-lg flex items-center justify-center">
            <Shield className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Güvenlik & Uyum</h1>
            <p className="text-text-secondary">KVKK/GDPR uyumu ve güvenlik yönetimi</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-text-secondary">Kritik Uyarılar</p>
            <p className="text-2xl font-bold text-danger">{criticalCount + highCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary">Bekleyen Talepler</p>
            <p className="text-2xl font-bold text-warning">{pendingRequests}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-danger" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Kritik Olaylar</p>
                <p className="text-xl font-bold text-text-primary">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Database className="text-info" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Veri Talepleri</p>
                <p className="text-xl font-bold text-text-primary">{dataRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="text-success" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Aktif Rızalar</p>
                <p className="text-xl font-bold text-text-primary">{activeConsents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="text-brand-500" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Günlük Loglar</p>
                <p className="text-xl font-bold text-text-primary">{securityLogs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-surface-2 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'bg-brand-500 text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Güvenlik Logları
        </button>
        <button
          onClick={() => setActiveTab('data_requests')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'data_requests'
              ? 'bg-brand-500 text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Veri Talepleri
        </button>
        <button
          onClick={() => setActiveTab('consent')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'consent'
              ? 'bg-brand-500 text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Rıza Yönetimi
        </button>
      </div>

      {/* Security Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Güvenlik Logları</CardTitle>
              <Button variant="outline">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {securityLogs.map((log) => {
                const TypeIcon = getTypeIcon(log.type);
                
                return (
                  <div key={log.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center">
                          <TypeIcon className="text-text-primary" size={20} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-text-primary">{log.action}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                              {log.severity}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          
                          <p className="text-text-secondary mb-2">{log.details}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-text-muted">
                            <span>Kullanıcı: {log.userName}</span>
                            <span>IP: {log.ipAddress}</span>
                            <span>{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogModal(true);
                        }}
                      >
                        <Eye size={14} className="mr-1" />
                        Detay
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Requests Tab */}
      {activeTab === 'data_requests' && (
        <Card>
          <CardHeader>
            <CardTitle>Veri Talepleri</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {dataRequests.map((request) => (
                <div key={request.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-text-primary">{request.userName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.type === 'export' ? 'text-info bg-info/10' : 'text-danger bg-danger/10'
                        }`}>
                          {request.type === 'export' ? 'Veri İndirme' : 'Veri Silme'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <p className="text-text-secondary text-sm mb-2">{request.userEmail}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-text-muted">
                        <span>Talep: {new Date(request.requestedAt).toLocaleDateString('tr-TR')}</span>
                        {request.completedAt && (
                          <span>Tamamlandı: {new Date(request.completedAt).toLocaleDateString('tr-TR')}</span>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm text-text-secondary mb-1">Veri Türleri:</p>
                        <div className="flex flex-wrap gap-1">
                          {request.dataTypes.map(type => (
                            <span key={type} className="px-2 py-1 bg-surface-3 text-text-primary text-xs rounded-full">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {request.reason && (
                        <div className="mt-2">
                          <p className="text-sm text-text-secondary">Sebep: {request.reason}</p>
                        </div>
                      )}
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleDataRequestAction(request.id, 'approve')}
                          className="bg-success hover:bg-success/80"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDataRequestAction(request.id, 'reject')}
                        >
                          Reddet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent Management Tab */}
      {activeTab === 'consent' && (
        <Card>
          <CardHeader>
            <CardTitle>Rıza Kayıtları</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {consentRecords.map((consent) => (
                <div key={consent.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-text-primary">{consent.userName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          consent.consentType === 'marketing' ? 'text-brand-500 bg-brand-500/10' :
                          consent.consentType === 'analytics' ? 'text-info bg-info/10' :
                          consent.consentType === 'cookies' ? 'text-accent-amber bg-accent-amber/10' :
                          'text-success bg-success/10'
                        }`}>
                          {consent.consentType}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consent.status)}`}>
                          {consent.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-text-muted">
                        <span>Tarih: {new Date(consent.timestamp).toLocaleString('tr-TR')}</span>
                        <span>IP: {consent.ipAddress}</span>
                        <span>Versiyon: {consent.version}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Detail Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Log Detayları</CardTitle>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">{selectedLog.action}</h3>
                  <p className="text-text-secondary">{selectedLog.details}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Kullanıcı</p>
                    <p className="font-medium text-text-primary">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Kullanıcı ID</p>
                    <p className="font-medium text-text-primary">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">IP Adresi</p>
                    <p className="font-medium text-text-primary">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Zaman</p>
                    <p className="font-medium text-text-primary">
                      {new Date(selectedLog.timestamp).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-text-secondary mb-2">User Agent</p>
                  <p className="text-text-primary text-sm bg-surface-2 p-3 rounded-lg font-mono">
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};