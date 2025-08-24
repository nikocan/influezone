import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Calculator,
  Target,
  Package,
  Building2,
  Users,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface CommissionRule {
  id: string;
  name: string;
  type: 'global' | 'brand' | 'product' | 'campaign' | 'influencer';
  scope: string;
  rate: number;
  rateType: 'percentage' | 'fixed';
  minAmount?: number;
  maxAmount?: number;
  priority: number;
  isActive: boolean;
  conditions?: {
    minFollowers?: number;
    categories?: string[];
    regions?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const mockCommissionRules: CommissionRule[] = [
  {
    id: '1',
    name: 'Global Varsayılan',
    type: 'global',
    scope: 'Tüm işlemler',
    rate: 15,
    rateType: 'percentage',
    priority: 1,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Premium Markalar',
    type: 'brand',
    scope: 'Premium kategorisi markalar',
    rate: 20,
    rateType: 'percentage',
    minAmount: 100,
    priority: 2,
    isActive: true,
    conditions: {
      categories: ['Lüks', 'Premium']
    },
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20'
  },
  {
    id: '3',
    name: 'Mega Influencer Bonusu',
    type: 'influencer',
    scope: '1M+ takipçili influencerlar',
    rate: 25,
    rateType: 'percentage',
    priority: 3,
    isActive: true,
    conditions: {
      minFollowers: 1000000
    },
    createdAt: '2024-01-05',
    updatedAt: '2024-01-25'
  },
  {
    id: '4',
    name: 'Elektronik Ürünler',
    type: 'product',
    scope: 'Elektronik kategorisi',
    rate: 50,
    rateType: 'fixed',
    maxAmount: 500,
    priority: 4,
    isActive: true,
    conditions: {
      categories: ['Elektronik', 'Teknoloji']
    },
    createdAt: '2024-01-12',
    updatedAt: '2024-01-22'
  },
  {
    id: '5',
    name: 'Yaz Kampanyası',
    type: 'campaign',
    scope: 'Yaz 2024 kampanyası',
    rate: 30,
    rateType: 'percentage',
    priority: 5,
    isActive: false,
    createdAt: '2024-01-08',
    updatedAt: '2024-01-18'
  }
];

export const CommissionRules: React.FC = () => {
  const [rules, setRules] = useState(mockCommissionRules);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Simulation form state
  const [simForm, setSimForm] = useState({
    orderAmount: 1000,
    influencerFollowers: 50000,
    brandCategory: 'Fashion',
    productCategory: 'Giyim',
    campaignType: 'regular'
  });

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const handlePriorityChange = (ruleId: string, direction: 'up' | 'down') => {
    setRules(prev => {
      const ruleIndex = prev.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) return prev;
      
      const newRules = [...prev];
      const currentRule = newRules[ruleIndex];
      
      if (direction === 'up' && ruleIndex > 0) {
        const prevRule = newRules[ruleIndex - 1];
        [currentRule.priority, prevRule.priority] = [prevRule.priority, currentRule.priority];
        [newRules[ruleIndex], newRules[ruleIndex - 1]] = [newRules[ruleIndex - 1], newRules[ruleIndex]];
      } else if (direction === 'down' && ruleIndex < newRules.length - 1) {
        const nextRule = newRules[ruleIndex + 1];
        [currentRule.priority, nextRule.priority] = [nextRule.priority, currentRule.priority];
        [newRules[ruleIndex], newRules[ruleIndex + 1]] = [newRules[ruleIndex + 1], newRules[ruleIndex]];
      }
      
      return newRules;
    });
  };

  const simulateCommission = () => {
    // Simulate commission calculation based on rules
    const applicableRules = rules
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    let finalRate = 0;
    let appliedRule = null;

    for (const rule of applicableRules) {
      let applies = false;

      switch (rule.type) {
        case 'global':
          applies = true;
          break;
        case 'influencer':
          applies = !rule.conditions?.minFollowers || simForm.influencerFollowers >= rule.conditions.minFollowers;
          break;
        case 'brand':
          applies = !rule.conditions?.categories || rule.conditions.categories.includes(simForm.brandCategory);
          break;
        case 'product':
          applies = !rule.conditions?.categories || rule.conditions.categories.includes(simForm.productCategory);
          break;
        case 'campaign':
          applies = simForm.campaignType === 'special';
          break;
      }

      if (applies) {
        if (rule.minAmount && simForm.orderAmount < rule.minAmount) applies = false;
        if (rule.maxAmount && simForm.orderAmount > rule.maxAmount) applies = false;
      }

      if (applies) {
        finalRate = rule.rate;
        appliedRule = rule;
        break;
      }
    }

    const commission = rule.rateType === 'percentage' 
      ? (simForm.orderAmount * finalRate) / 100
      : finalRate;

    setSimulationResult({
      appliedRule,
      finalRate,
      commission,
      orderAmount: simForm.orderAmount
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'global': return DollarSign;
      case 'brand': return Building2;
      case 'product': return Package;
      case 'campaign': return Target;
      case 'influencer': return Users;
      default: return DollarSign;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'global': return 'text-brand-500 bg-brand-500/10';
      case 'brand': return 'text-accent-amber bg-accent-amber/10';
      case 'product': return 'text-info bg-info/10';
      case 'campaign': return 'text-accent-coral bg-accent-coral/10';
      case 'influencer': return 'text-success bg-success/10';
      default: return 'text-text-secondary bg-surface-2';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-success to-brand-500 rounded-lg flex items-center justify-center">
            <DollarSign className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Komisyon Kuralları</h1>
            <p className="text-text-secondary">Komisyon oranlarını ve koşullarını yönet</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowSimulator(true)}
          >
            <Calculator size={16} className="mr-2" />
            Simülasyon
          </Button>
          <Button onClick={() => setShowRuleModal(true)}>
            <Plus size={16} className="mr-2" />
            Yeni Kural
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="text-success" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Aktif Kurallar</p>
                <p className="text-xl font-bold text-text-primary">
                  {rules.filter(r => r.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Target className="text-brand-500" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Ortalama Oran</p>
                <p className="text-xl font-bold text-text-primary">
                  {Math.round(rules.reduce((acc, r) => acc + r.rate, 0) / rules.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Building2 className="text-accent-amber" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Marka Kuralları</p>
                <p className="text-xl font-bold text-text-primary">
                  {rules.filter(r => r.type === 'brand').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="text-info" size={20} />
              <div>
                <p className="text-sm text-text-secondary">Influencer Kuralları</p>
                <p className="text-xl font-bold text-text-primary">
                  {rules.filter(r => r.type === 'influencer').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Komisyon Kuralları ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-4">
            {rules
              .sort((a, b) => b.priority - a.priority)
              .map((rule, index) => {
                const TypeIcon = getTypeIcon(rule.type);
                
                return (
                  <div key={rule.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-text-secondary">#{rule.priority}</span>
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handlePriorityChange(rule.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-text-muted hover:text-text-primary disabled:opacity-50"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() => handlePriorityChange(rule.id, 'down')}
                              disabled={index === rules.length - 1}
                              className="p-1 text-text-muted hover:text-text-primary disabled:opacity-50"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center">
                          <TypeIcon className="text-text-primary" size={20} />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-text-primary">{rule.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(rule.type)}`}>
                              {rule.type}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rule.isActive ? 'text-success bg-success/10' : 'text-text-muted bg-surface-3'
                            }`}>
                              {rule.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <p className="text-text-secondary text-sm mb-1">{rule.scope}</p>
                          <div className="flex items-center space-x-4 text-sm text-text-muted">
                            <span>
                              Oran: {rule.rate}{rule.rateType === 'percentage' ? '%' : '₺'}
                            </span>
                            {rule.minAmount && <span>Min: ₺{rule.minAmount}</span>}
                            {rule.maxAmount && <span>Max: ₺{rule.maxAmount}</span>}
                            <span>Güncelleme: {rule.updatedAt}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            rule.isActive 
                              ? 'bg-warning/20 text-warning hover:bg-warning/30' 
                              : 'bg-success/20 text-success hover:bg-success/30'
                          }`}
                        >
                          {rule.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowRuleModal(true);
                          }}
                          className="p-2 text-text-secondary hover:text-brand-500 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 text-text-secondary hover:text-danger transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {rule.conditions && (
                      <div className="mt-3 p-3 bg-surface-1 rounded-lg">
                        <p className="text-sm font-medium text-text-primary mb-2">Koşullar:</p>
                        <div className="flex flex-wrap gap-2">
                          {rule.conditions.minFollowers && (
                            <span className="px-2 py-1 bg-info/20 text-info text-xs rounded-full">
                              Min {rule.conditions.minFollowers.toLocaleString()} takipçi
                            </span>
                          )}
                          {rule.conditions.categories?.map(cat => (
                            <span key={cat} className="px-2 py-1 bg-accent-amber/20 text-accent-amber text-xs rounded-full">
                              {cat}
                            </span>
                          ))}
                          {rule.conditions.regions?.map(region => (
                            <span key={region} className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">
                              {region}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Commission Simulator Modal */}
      {showSimulator && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Komisyon Simülatörü</CardTitle>
                <button
                  onClick={() => setShowSimulator(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Sipariş Tutarı (₺)
                    </label>
                    <input
                      type="number"
                      value={simForm.orderAmount}
                      onChange={(e) => setSimForm(prev => ({ ...prev, orderAmount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Influencer Takipçi Sayısı
                    </label>
                    <input
                      type="number"
                      value={simForm.influencerFollowers}
                      onChange={(e) => setSimForm(prev => ({ ...prev, influencerFollowers: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Marka Kategorisi
                    </label>
                    <select
                      value={simForm.brandCategory}
                      onChange={(e) => setSimForm(prev => ({ ...prev, brandCategory: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Fashion">Fashion</option>
                      <option value="Premium">Premium</option>
                      <option value="Lüks">Lüks</option>
                      <option value="Teknoloji">Teknoloji</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Ürün Kategorisi
                    </label>
                    <select
                      value={simForm.productCategory}
                      onChange={(e) => setSimForm(prev => ({ ...prev, productCategory: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Giyim">Giyim</option>
                      <option value="Elektronik">Elektronik</option>
                      <option value="Teknoloji">Teknoloji</option>
                      <option value="Kozmetik">Kozmetik</option>
                    </select>
                  </div>
                </div>

                <Button onClick={simulateCommission} className="w-full">
                  <Calculator size={16} className="mr-2" />
                  Komisyonu Hesapla
                </Button>

                {simulationResult && (
                  <div className="p-4 bg-surface-2 rounded-lg border border-border">
                    <h4 className="font-semibold text-text-primary mb-3">Hesaplama Sonucu</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sipariş Tutarı:</span>
                        <span className="font-medium text-text-primary">₺{simulationResult.orderAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Uygulanan Kural:</span>
                        <span className="font-medium text-text-primary">
                          {simulationResult.appliedRule?.name || 'Hiçbiri'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Komisyon Oranı:</span>
                        <span className="font-medium text-text-primary">
                          {simulationResult.finalRate}%
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                        <span className="text-text-primary">Toplam Komisyon:</span>
                        <span className="text-success">₺{simulationResult.commission.toLocaleString()}</span>
                      </div>
                    </div>
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