import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Product } from '../types';
import { Search, Filter, Heart, ShoppingCart, Star, Truck } from 'lucide-react';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Minimalist Cüzdan',
    price: 149,
    image: 'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?w=300&h=300&fit=crop',
    category: 'Aksesuar',
    brand: 'ModernStyle',
    stock: 24,
    description: 'Gerçek deri, RFID korumalı minimalist cüzdan'
  },
  {
    id: '2',
    name: 'Organik Cilt Bakım Seti',
    price: 299,
    image: 'https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?w=300&h=300&fit=crop',
    category: 'Güzellik',
    brand: 'NaturalGlow',
    stock: 8,
    description: 'Doğal ingredientler ile zenginleştirilmiş'
  },
  {
    id: '3',
    name: 'Akıllı Fitness Saati',
    price: 899,
    image: 'https://images.pexels.com/photos/1909656/pexels-photo-1909656.jpeg?w=300&h=300&fit=crop',
    category: 'Teknoloji',
    brand: 'SmartFit',
    stock: 15,
    description: 'Kalp ritmi, uyku takibi ve GPS özellikli'
  },
  {
    id: '4',
    name: 'Sürdürülebilir Yoga Matı',
    price: 179,
    image: 'https://images.pexels.com/photos/4325448/pexels-photo-4325448.jpeg?w=300&h=300&fit=crop',
    category: 'Spor',
    brand: 'EcoFit',
    stock: 32,
    description: 'Geri dönüştürülmüş malzemelerden üretilmiş'
  }
];

const influencerStores = [
  {
    id: '1',
    name: 'Sarah\'s Lifestyle Store',
    influencer: 'Sarah Lifestyle',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 125000,
    productCount: 23,
    category: 'Lifestyle & Fashion',
    featuredImage: 'https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?w=400&h=200&fit=crop'
  },
  {
    id: '2',
    name: 'Tech Corner',
    influencer: 'Tech Guru Ali',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face',
    followers: 89000,
    productCount: 15,
    category: 'Technology',
    featuredImage: 'https://images.pexels.com/photos/1909656/pexels-photo-1909656.jpeg?w=400&h=200&fit=crop'
  }
];

export const Explore: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
          <ShoppingCart className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keşfet</h1>
          <p className="text-gray-600">Influencer mağazalarından en iyi ürünleri keşfedin</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ürün, marka veya influencer ara..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-3">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tüm Kategoriler</option>
            <option value="aksesuar">Aksesuar</option>
            <option value="güzellik">Güzellik</option>
            <option value="teknoloji">Teknoloji</option>
            <option value="spor">Spor</option>
          </select>
          <Button variant="outline">
            <Filter size={16} className="mr-2" />
            Filtrele
          </Button>
        </div>
      </div>

      {/* Featured Stores */}
      <Card>
        <CardHeader>
          <CardTitle>Öne Çıkan Mağazalar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {influencerStores.map((store) => (
              <div
                key={store.id}
                className="relative group cursor-pointer rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity"
                  style={{ backgroundImage: `url(${store.featuredImage})` }}
                />
                <div className="relative p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={store.avatar}
                      alt={store.influencer}
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <div>
                      <h3 className="text-xl font-bold">{store.name}</h3>
                      <p className="text-gray-300">by {store.influencer}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">{store.category}</p>
                      <p className="text-lg font-semibold">{store.productCount} ürün</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">Takipçi</p>
                      <p className="text-lg font-semibold">{(store.followers / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockProducts.map((product) => (
          <Card key={product.id} hover className="group">
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-colors ${
                  favorites.has(product.id)
                    ? 'bg-red-500 text-white'
                    : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
                }`}
              >
                <Heart size={16} className={favorites.has(product.id) ? 'fill-current' : ''} />
              </button>
              
              {product.stock < 10 && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  Son {product.stock} Adet!
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-purple-600">₺{product.price}</p>
                  <div className="flex items-center space-x-1">
                    <Star size={12} className="text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">4.8</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="flex items-center">
                  <Truck size={12} className="mr-1" />
                  Ücretsiz Kargo
                </span>
                <span>{product.brand}</span>
              </div>
              
              <Button size="sm" className="w-full">
                <ShoppingCart size={14} className="mr-2" />
                Sepete Ekle
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};