import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  Ban, 
  UserCheck, 
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const mockUsers: (User & { 
  status: 'active' | 'suspended' | 'pending';
  joinDate: string;
  lastActive: string;
  totalEarnings?: number;
  totalSpent?: number;
  kycStatus: 'verified' | 'pending' | 'rejected';
})[] = [
  {
    id: '1',
    name: 'Sarah Lifestyle',
    email: 'sarah@example.com',
    role: 'influencer',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    verified: true,
    status: 'active',
    joinDate: '2024-01-15',
    lastActive: '2 saat önce',
    totalEarnings: 15600,
    kycStatus: 'verified'
  },
  {
    id: '2',
    name: 'Brand Manager',
    email: 'brand@example.com',
    role: 'brand',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face',
    status: 'active',
    joinDate: '2024-02-20',
    lastActive: '1 gün önce',
    kycStatus: 'verified'
  },
  {
    id: '3',
    name: 'Happy Customer',
    email: 'customer@example.com',
    role: 'consumer',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=150&h=150&fit=crop&crop=face',
    status: 'active',
    joinDate: '2024-03-10',
    lastActive: '5 dk önce',
    totalSpent: 2400,
    kycStatus: 'pending'
  },
  {
    id: '4',
    name: 'Suspended User',
    email: 'suspended@example.com',
    role: 'influencer',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face',
    status: 'suspended',
    joinDate: '2024-01-05',
    lastActive: '1 hafta önce',
    totalEarnings: 890,
    kycStatus: 'rejected'
  }
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete' | 'verify') => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        switch (action) {
          case 'suspend':
            return { ...user, status: 'suspended' as const };
          case 'activate':
            return { ...user, status: 'active' as const };
          case 'verify':
            return { ...user, kycStatus: 'verified' as const };
          case 'delete':
            return user; // In real app, would remove from list
        }
      }
      return user;
    }));
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} for users:`, Array.from(selectedUsers));
    setSelectedUsers(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success bg-success/10';
      case 'suspended': return 'text-danger bg-danger/10';
      case 'pending': return 'text-warning bg-warning/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-success';
      case 'pending': return 'text-warning';
      case 'rejected': return 'text-danger';
      default: return 'text-text-secondary';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'influencer': return 'text-brand-500 bg-brand-500/10';
      case 'brand': return 'text-accent-amber bg-accent-amber/10';
      case 'consumer': return 'text-info bg-info/10';
      case 'admin': return 'text-text-primary bg-surface-3';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-info rounded-lg flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Kullanıcı Yönetimi</h1>
            <p className="text-text-secondary">Tüm kullanıcıları yönet ve denetle</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload size={16} className="mr-2" />
            Import
          </Button>
        </div>
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
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Roller</option>
              <option value="influencer">Influencer</option>
              <option value="brand">Marka</option>
              <option value="consumer">Müşteri</option>
              <option value="admin">Admin</option>
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="suspended">Askıya Alınmış</option>
              <option value="pending">Beklemede</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">{selectedUsers.size} kullanıcı seçildi</span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                  Aktifleştir
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')}>
                  Askıya Al
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>
                  Sil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcılar ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                        } else {
                          setSelectedUsers(new Set());
                        }
                      }}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left p-4 text-text-primary font-medium">Kullanıcı</th>
                  <th className="text-left p-4 text-text-primary font-medium">Rol</th>
                  <th className="text-left p-4 text-text-primary font-medium">Durum</th>
                  <th className="text-left p-4 text-text-primary font-medium">KYC</th>
                  <th className="text-left p-4 text-text-primary font-medium">Katılım</th>
                  <th className="text-left p-4 text-text-primary font-medium">Son Aktivite</th>
                  <th className="text-left p-4 text-text-primary font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border hover:bg-surface-2/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSelected.add(user.id);
                          } else {
                            newSelected.delete(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-text-primary">{user.name}</p>
                          <p className="text-sm text-text-secondary">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        {user.kycStatus === 'verified' && <CheckCircle size={16} className="text-success" />}
                        {user.kycStatus === 'pending' && <AlertTriangle size={16} className="text-warning" />}
                        {user.kycStatus === 'rejected' && <XCircle size={16} className="text-danger" />}
                        <span className={`text-sm ${getKycStatusColor(user.kycStatus)}`}>
                          {user.kycStatus}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary text-sm">{user.joinDate}</td>
                    <td className="p-4 text-text-secondary text-sm">{user.lastActive}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-1 text-text-secondary hover:text-info transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="p-1 text-text-secondary hover:text-brand-500 transition-colors">
                          <Edit size={16} />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            className="p-1 text-text-secondary hover:text-warning transition-colors"
                          >
                            <Ban size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user.id, 'activate')}
                            className="p-1 text-text-secondary hover:text-success transition-colors"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(user.id, 'delete')}
                          className="p-1 text-text-secondary hover:text-danger transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Kullanıcı Detayları</CardTitle>
                <button
                  onClick={() => setShowUserModal(false)}
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
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{selectedUser.name}</h3>
                    <p className="text-text-secondary">{selectedUser.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Katılım Tarihi</p>
                    <p className="font-medium text-text-primary">{selectedUser.joinDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Son Aktivite</p>
                    <p className="font-medium text-text-primary">{selectedUser.lastActive}</p>
                  </div>
                  {selectedUser.totalEarnings && (
                    <div>
                      <p className="text-sm text-text-secondary">Toplam Kazanç</p>
                      <p className="font-medium text-success">₺{selectedUser.totalEarnings.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedUser.totalSpent && (
                    <div>
                      <p className="text-sm text-text-secondary">Toplam Harcama</p>
                      <p className="font-medium text-info">₺{selectedUser.totalSpent.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleUserAction(selectedUser.id, 'verify')}
                    disabled={selectedUser.kycStatus === 'verified'}
                  >
                    KYC Onayla
                  </Button>
                  {selectedUser.status === 'active' ? (
                    <Button
                      variant="outline"
                      onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                    >
                      Askıya Al
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleUserAction(selectedUser.id, 'activate')}
                    >
                      Aktifleştir
                    </Button>
                  )}
                  <Button variant="danger">
                    Hesabı Sil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};