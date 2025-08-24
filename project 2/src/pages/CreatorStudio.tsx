import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Brain, Copy, Calendar, Hash, Camera, Video, Wand2, Sparkles } from 'lucide-react';

export const CreatorStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    // Simulate AI generation
    setTimeout(() => {
      setGeneratedCaptions([
        `🌟 Yeni keşfim! ${prompt} hakkında düşüncelerimi paylaşıyorum. Sizce de harika değil mi? #yenikeşif #lifestyle #öneri`,
        `Bu ${prompt.toLowerCase()} ile tanıştığımdan beri hayatım değişti! ✨ Deneyimlerimi story'de paylaştım, kaçırmayın! #gameChanger #musthave`,
        `${prompt} ile ilgili merak ettiklerinizi DM'den sorabilirsiniz 💜 Detayları bio linkimde! #soru #detay #biolink`
      ]);
      setLoading(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const suggestedHashtags = [
    '#lifestyle', '#fashion', '#beauty', '#tech', '#travel', '#food', '#fitness', '#home',
    '#sustainable', '#trending', '#musthave', '#review', '#unboxing', '#ootd'
  ];

  const bestPostingTimes = [
    { time: '09:00', platform: 'Instagram', engagement: '85%' },
    { time: '19:00', platform: 'TikTok', engagement: '92%' },
    { time: '14:00', platform: 'Twitter', engagement: '78%' },
    { time: '20:00', platform: 'Instagram', engagement: '89%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-brand-gradient rounded-lg flex items-center justify-center shadow-glow">
          <Sparkles className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creator Studio</h1>
          <p className="text-text-secondary">AI destekli içerik üretim merkezi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Caption Generator */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="text-brand-500" size={20} />
                <span>Caption Üretici</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Ürün veya içerik hakkında kısa açıklama
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Örn: Yeni aldığım sürdürülebilir bambu diş fırçası..."
                  className="w-full px-4 py-3 bg-surface-2 border border-border text-text-primary placeholder-text-muted rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleGenerate}
                  loading={loading}
                  disabled={!prompt.trim()}
                  className="flex-1"
                >
                  <Wand2 size={16} className="mr-2" />
                  Caption Üret
                </Button>
                <select className="px-4 py-2 bg-surface-2 border border-border text-text-primary rounded-lg focus:ring-2 focus:ring-brand-500">
                  <option>Eğlenceli Ton</option>
                  <option>Profesyonel Ton</option>
                  <option>Samimi Ton</option>
                </select>
              </div>

              {generatedCaptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-text-primary">Üretilen Captionlar</h4>
                  {generatedCaptions.map((caption, index) => (
                    <div key={index} className="p-4 bg-surface-2 rounded-lg border border-border">
                      <p className="text-text-primary mb-3">{caption}</p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(caption)}
                        >
                          <Copy size={14} className="mr-1" />
                          Kopyala
                        </Button>
                        <Button size="sm" variant="ghost">
                          Taslak Kaydet
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          {/* Hashtag Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="text-accent-amber" size={20} />
                <span>Trend Hashtagler</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestedHashtags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => copyToClipboard(tag)}
                    className="px-3 py-1 bg-surface-2 text-text-secondary rounded-full text-sm hover:bg-brand-500/20 hover:text-brand-500 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Posting Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="text-success" size={20} />
                <span>En İyi Saatler</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bestPostingTimes.map((time, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{time.time}</span>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{time.platform}</p>
                        <p className="text-xs text-text-secondary">Etkileşim: {time.engagement}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Visual Content Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="text-info" size={20} />
                <span>Görsel Önerileri</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-info/10 rounded-lg border border-info/20">
                  <p className="font-medium text-text-primary text-sm">Flat Lay</p>
                  <p className="text-text-secondary text-xs">Ürünü yukarıdan çek, minimal arka plan</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="font-medium text-text-primary text-sm">Lifestyle Shot</p>
                  <p className="text-text-secondary text-xs">Günlük kullanımda göster, doğal ışık</p>
                </div>
                <div className="p-3 bg-brand-500/10 rounded-lg border border-brand-500/20">
                  <p className="font-medium text-text-primary text-sm">Before/After</p>
                  <p className="text-text-secondary text-xs">Karşılaştırma formatı, grid düzen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};