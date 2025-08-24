import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ThemeProvider from './components/ThemeProvider';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { CreatorStudio } from './pages/CreatorStudio';
import { InfluencerDiscovery } from './pages/InfluencerDiscovery';
import { SmartMatch } from './pages/SmartMatch';
import { Gamification } from './pages/Gamification';
import { CommunityChat } from './pages/CommunityChat';
import { Explore } from './pages/Explore';
import { UserManagement } from './pages/UserManagement';
import { Moderation } from './pages/Moderation';
import { CommissionRules } from './pages/CommissionRules';
import { PayoutManagement } from './pages/PayoutManagement';
import { SecurityCompliance } from './pages/SecurityCompliance';
import { Layout } from './components/layout/Layout';
import { useNavigation } from './hooks/useNavigation';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { currentPage, navigate } = useNavigation();

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'creator-studio':
        return <CreatorStudio />;
      case 'discovery':
        return <InfluencerDiscovery />;
      case 'smartmatch':
        return <SmartMatch />;
      case 'gamification':
        return <Gamification />;
      case 'community':
        return <CommunityChat />;
      case 'explore':
        return <Explore />;
      case 'user-mgmt':
        return <UserManagement />;
      case 'moderation':
        return <Moderation />;
      case 'commission':
        return <CommissionRules />;
      case 'payout-mgmt':
        return <PayoutManagement />;
      case 'security':
        return <SecurityCompliance />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentPage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-gray-600 mb-6">Bu sayfa henüz geliştirme aşamasında.</p>
            <div className="p-8 bg-gradient-to-br from-purple-50 to-orange-50 rounded-xl border border-purple-200">
              <div className="text-6xl mb-4">🚧</div>
              <p className="text-lg font-medium text-gray-800">Yakında burada olacak!</p>
              <p className="text-sm text-gray-600 mt-2">
                Bu özellik gelecek güncellemelerde eklenecek.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout activeItem={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;