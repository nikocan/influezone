import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Sparkles, Users, Building2, Shield, ShoppingBag, Eye, EyeOff, Mail, Lock, Chrome, Smartphone } from 'lucide-react';

const roles = [
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'İçerik üreticileri için',
    icon: Users,
    color: 'from-brand-500 to-brand-600'
  },
  {
    id: 'brand',
    name: 'Marka',
    description: 'Markalar ve işletmeler için',
    icon: Building2,
    color: 'from-accent-amber to-orange-600'
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Sistem yöneticileri için',
    icon: Shield,
    color: 'from-gray-600 to-gray-700'
  },
  {
    id: 'consumer',
    name: 'Müşteri',
    description: 'Alışveriş deneyimi için',
    icon: ShoppingBag,
    color: 'from-success to-green-600'
  }
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const handleLogin = async (role: string) => {
    setLoading(true);
    try {
      await login('demo@example.com', 'password', role);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 4) return { strength: 'weak', color: 'bg-red-500', width: '25%', text: 'Zayıf' };
    if (password.length < 8) return { strength: 'medium', color: 'bg-amber-500', width: '50%', text: 'Orta' };
    if (password.length < 12) return { strength: 'good', color: 'bg-yellow-500', width: '75%', text: 'İyi' };
    return { strength: 'strong', color: 'bg-green-500', width: '100%', text: 'Güçlü' };
  };

  const passwordStrength = getPasswordStrength(password);

  if (showLogin) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1B2E 100%)' }}>
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-30" 
               style={{ background: 'radial-gradient(circle, #8A4FFF 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 opacity-25" 
               style={{ background: 'radial-gradient(circle, #3BAFDA 0%, transparent 70%)' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-2xl animate-pulse delay-500 opacity-20" 
               style={{ background: 'radial-gradient(circle, #8A4FFF 0%, transparent 70%)' }}></div>
          <div className="absolute top-3/4 left-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse delay-700 opacity-15" 
               style={{ background: 'radial-gradient(circle, #3BAFDA 0%, transparent 70%)' }}></div>
        </div>

        <div className="max-w-md w-full relative z-10 mx-auto pt-20">
          {/* Back Button */}
          <button
            onClick={() => setShowLogin(false)}
            className="mb-6 text-gray-400 hover:text-white transition-all duration-300 flex items-center space-x-2 group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform duration-300">←</span>
            <span>Geri Dön</span>
          </button>

          {/* Login Card */}
          <div className="backdrop-blur-sm rounded-2xl border overflow-hidden transform hover:scale-[1.02] transition-all duration-500"
               style={{ 
                 background: 'rgba(26, 27, 46, 0.8)',
                 borderColor: '#2B2C3F',
                 boxShadow: '0 0 24px rgba(138, 79, 255, 0.3), 0 0 48px rgba(138, 79, 255, 0.1)'
               }}>
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden group"
                     style={{ background: 'linear-gradient(135deg, #8A4FFF 0%, #7A3BFF 100%)' }}>
                  <Sparkles size={28} className="text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">Giriş Yap</CardTitle>
              <p className="text-gray-400">Hesabınıza erişim sağlayın</p>
            </CardHeader>

            <CardContent className="space-y-6 p-8">
              {/* Social Login Buttons */}
              <div className="space-y-4">
                <button
                  onClick={() => handleLogin(selectedRole || 'influencer')}
                  className="w-full bg-white text-gray-900 border border-transparent hover:border-purple-400 rounded-xl px-6 py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center space-x-3"
                >
                  <Chrome size={20} />
                  <span>Google ile Giriş Yap</span>
                </button>
                
                <button
                  onClick={() => handleLogin(selectedRole || 'influencer')}
                  className="w-full bg-black text-white border border-gray-700 hover:border-gray-500 rounded-xl px-6 py-4 font-medium transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-500/20 flex items-center justify-center space-x-3"
                >
                  <Smartphone size={20} />
                  <span>Apple ile Giriş Yap</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 text-gray-400" style={{ background: 'rgba(26, 27, 46, 0.8)' }}>veya</span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-300" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border transition-all duration-300 focus:outline-none text-white placeholder-gray-500"
                    style={{ 
                      background: '#121327',
                      borderColor: '#2B2C3F'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8A4FFF';
                      e.target.style.boxShadow = '0 0 0 4px rgba(138, 79, 255, 0.22)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#2B2C3F';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Şifre</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-300" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifrenizi girin"
                    className="w-full pl-12 pr-14 py-4 rounded-xl border transition-all duration-300 focus:outline-none text-white placeholder-gray-500"
                    style={{ 
                      background: '#121327',
                      borderColor: '#2B2C3F'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8A4FFF';
                      e.target.style.boxShadow = '0 0 0 4px rgba(138, 79, 255, 0.22)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#2B2C3F';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Şifre gücü: <span className={`font-medium ${
                        passwordStrength.strength === 'weak' ? 'text-red-400' :
                        passwordStrength.strength === 'medium' ? 'text-amber-400' :
                        passwordStrength.strength === 'good' ? 'text-yellow-400' : 'text-green-400'
                      }`}>{passwordStrength.text}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 2FA Code (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Doğrulama Kodu (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="6 haneli kod"
                  className="w-full px-4 py-4 rounded-xl border transition-all duration-300 focus:outline-none text-white placeholder-gray-500"
                  style={{ 
                    background: '#121327',
                    borderColor: '#2B2C3F'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8A4FFF';
                    e.target.style.boxShadow = '0 0 0 4px rgba(138, 79, 255, 0.22)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2B2C3F';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Login Button */}
              <button
                onClick={() => handleLogin(selectedRole || 'influencer')}
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{ 
                  background: 'linear-gradient(135deg, #8A4FFF 0%, #7A3BFF 100%)',
                  color: '#0F0F1A',
                  boxShadow: '0 0 20px rgba(138, 79, 255, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(138, 79, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(138, 79, 255, 0.4)';
                }}
              >
                {loading && (
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-current border-t-transparent rounded-full inline-block" />
                )}
                Giriş Yap
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>

              {/* Forgot Password */}
              <div className="text-center">
                <button className="text-sm hover:underline transition-all duration-300 hover:text-white"
                        style={{ color: '#3BAFDA' }}>
                  Şifremi Unuttum
                </button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-gray-400">
                  Hesabınız yok mu?{' '}
                  <button className="font-medium transition-all duration-300 hover:underline"
                          style={{ color: '#8A4FFF' }}
                          onMouseEnter={(e) => e.target.style.color = '#B497FF'}
                          onMouseLeave={(e) => e.target.style.color = '#8A4FFF'}>
                    Üye Ol
                  </button>
                </p>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1B2E 100%)' }}>
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-30" 
             style={{ background: 'radial-gradient(circle, #8A4FFF 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 opacity-25" 
             style={{ background: 'radial-gradient(circle, #3BAFDA 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-2xl animate-pulse delay-500 opacity-20" 
             style={{ background: 'radial-gradient(circle, #8A4FFF 0%, transparent 70%)' }}></div>
        <div className="absolute top-3/4 left-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse delay-700 opacity-15" 
             style={{ background: 'radial-gradient(circle, #3BAFDA 0%, transparent 70%)' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative overflow-hidden group"
                 style={{ 
                   background: 'linear-gradient(135deg, #8A4FFF 0%, #7A3BFF 100%)',
                   boxShadow: '0 0 40px rgba(138, 79, 255, 0.5)'
                 }}>
              <Sparkles size={48} className="text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 bg-clip-text text-transparent animate-pulse">
              Yeni Nesil Influencer
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent animate-pulse delay-500">
              Ticaret Ekosistemi
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Markalar, Influencer'lar ve Tüketiciler tek yerde. 
            <br />
            <span className="text-purple-400 font-medium">AI destekli satış, içerik ve gelir sistemi.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <button
              onClick={() => setShowLogin(true)}
              className="px-10 py-5 text-xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
              style={{ 
                background: 'linear-gradient(135deg, #8A4FFF 0%, #7A3BFF 100%)',
                color: '#0F0F1A',
                boxShadow: '0 0 30px rgba(138, 79, 255, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 50px rgba(138, 79, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(138, 79, 255, 0.5)';
              }}
            >
              <Sparkles size={24} className="inline mr-3" />
              Üye Ol
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            
            <button className="px-10 py-5 text-xl font-semibold rounded-2xl border-2 text-white hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
                    style={{ borderColor: '#8A4FFF' }}>
              Daha Fazla Keşfet
            </button>
          </div>
        </div>

        {/* Role Selection Preview */}
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Hangi Panel İle Başlamak İstiyorsunuz?</h2>
            <p className="text-gray-400 text-lg">Demo hesaplarla sistemi keşfedin</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roles.map((role) => {
              const Icon = role.icon;
              
              return (
                <div
                  key={role.id}
                  onClick={() => { setSelectedRole(role.id); handleLogin(role.id); }}
                  className="cursor-pointer transition-all duration-500 transform hover:scale-110 group"
                >
                  <div className="backdrop-blur-sm rounded-2xl p-8 text-center border transition-all duration-500 hover:border-purple-400"
                       style={{ 
                         background: 'rgba(26, 27, 46, 0.6)',
                         borderColor: '#2B2C3F'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.boxShadow = '0 0 30px rgba(138, 79, 255, 0.3)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.boxShadow = 'none';
                       }}>
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 relative overflow-hidden`}>
                      <Icon size={32} className="text-white relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{role.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{role.description}</p>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${role.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left`}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-20 text-center max-w-2xl">
          <div className="backdrop-blur-sm rounded-2xl p-8 border"
               style={{ 
                 background: 'rgba(26, 27, 46, 0.4)',
                 borderColor: '#2B2C3F'
               }}>
            <h3 className="text-2xl font-bold text-white mb-4">🚀 Demo Modu</h3>
            <p className="text-gray-400">
              Bu bir demo uygulamadır. Herhangi bir role tıklayarak sistemi keşfedebilirsiniz.
              Tüm veriler örnek verilerdir ve gerçek işlemler yapılmaz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};