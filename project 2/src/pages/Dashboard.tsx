import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart } from '../components/charts/LineChart';
import { 
  DollarSign, 
  MousePointer, 
  TrendingUp, 
  Users, 
  Gift,
  Globe,
  Target
} from 'lucide-react';

// Example data for line charts (you can replace with real data if available)
const salesData = [
  { label: 'Pzt', value: 1200 },
  { label: 'Sal', value: 1900 },
  { label: 'Çar', value: 800 },
  { label: 'Per', value: 2400 },
  { label: 'Cum', value: 3200 },
  { label: 'Cmt', value: 2800 },
  { label: 'Paz', value: 2100 }
];

const clickData = [
  { label: 'Pzt', value: 450 },
  { label: 'Sal', value: 720 },
  { label: 'Çar', value: 320 },
  { label: 'Per', value: 890 },
  { label: 'Cum', value: 1200 },
  { label: 'Cmt', value: 980 },
  { label: 'Paz', value: 760 }
];

// Unified InfluenceOS dashboard for all roles
const renderInfluenceOSDashboard = () => (
  <div className="space-y-6">
    {/* Influencer Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Toplam Influencer"
        value="6"
        change=""
        changeType="neutral"
        icon={Users}
        iconColor="text-brand-500"
      />
      <MetricCard
        title="Aktif Influencer"
        value="5"
        change=""
        changeType="neutral"
        icon={Users}
        iconColor="text-success"
      />
      <MetricCard
        title="Toplam Takipçi"
        value="0.7M"
        change=""
        changeType="neutral"
        icon={Users}
        iconColor="text-info"
      />
      <MetricCard
        title="Ort. Engagement"
        value="4.7%"
        change=""
        changeType="neutral"
        icon={TrendingUp}
        iconColor="text-accent-amber"
      />
    </div>

    {/* Campaign Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Toplam Kampanya"
        value="4"
        change=""
        changeType="neutral"
        icon={Gift}
        iconColor="text-brand-500"
      />
      <MetricCard
        title="Aktif Kampanya"
        value="2"
        change=""
        changeType="neutral"
        icon={Gift}
        iconColor="text-success"
      />
      <MetricCard
        title="Toplam Bütçe"
        value="₺280K"
        change=""
        changeType="neutral"
        icon={DollarSign}
        iconColor="text-info"
      />
      <MetricCard
        title="Toplam Reach"
        value="2.0M"
        change=""
        changeType="neutral"
        icon={Globe}
        iconColor="text-accent-amber"
      />
    </div>

    {/* Analytics Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Toplam Görüntüleme"
        value="326K"
        change="+12.5%"
        changeType="positive"
        icon={MousePointer}
        iconColor="text-brand-500"
      />
      <MetricCard
        title="Ort. Engagement"
        value="5.2%"
        change="+8.2%"
        changeType="positive"
        icon={TrendingUp}
        iconColor="text-success"
      />
      <MetricCard
        title="Toplam Gelir"
        value="₺15,700"
        change="+15.3%"
        changeType="positive"
        icon={DollarSign}
        iconColor="text-info"
      />
      <MetricCard
        title="Ort. Conversion"
        value="2.5%"
        change="+3.1%"
        changeType="positive"
        icon={Target}
        iconColor="text-accent-amber"
      />
    </div>

    {/* Example Charts (optional) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="text-brand-500" size={20} />
            <span>Satış Trendi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={salesData} color="#8A4FFF" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MousePointer className="text-info" size={20} />
            <span>Click Trendi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={clickData} color="#3BAFDA" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Show the unified InfluenceOS dashboard regardless of user role
  return (
    <div>
      {renderInfluenceOSDashboard()}
    </div>
  );
};