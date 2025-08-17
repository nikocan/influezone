import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// ---- Tema (Soft Mavi + Turuncu + Siyah) ----
const THEME = {
  blue: "#38bdf8",     // Tailwind sky-400 (soft mavi)
  blueDark: "#0ea5e9", // sky-500
  orange: "#fb923c",   // orange-400 (soft turuncu)
  black: "#111827",    // neutral-900
  grayText: "#334155", // slate-700
};

// Basit ikon yer tutucular
const Icon = ({ label }) => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 text-[10px] font-semibold">
    {label}
  </span>
);

// --- Basit runtime smoke testleri (Jest yoksa konsola yazar) ---
function runSmokeTests() {
  try {
    const results = [];
    results.push({ name: "Header var", pass: !!document.querySelector(".font-bold") });
    results.push({ name: "Admin Dashboard Huniler", pass: !!document.querySelector('[data-testid="admin-dashboard-funnels"]') });
    results.push({ name: "Kampanya tablosu satırları", pass: (document.querySelectorAll('[data-testid="campaigns-table"] tbody tr').length >= 3) });
    results.push({ name: "Automation kural 1", pass: !!document.querySelector('[data-testid="automation-rule-1"]') });
    results.push({ name: "Automation kural 2", pass: !!document.querySelector('[data-testid="automation-rule-2"]') });
    results.push({ name: "Automation kural 3", pass: !!document.querySelector('[data-testid="automation-rule-3"]') });
    // Kritik karakter testleri
    const pageText = document.body.innerText || "";
    results.push({ name: "Yasak karakter yok (→)", pass: !pageText.includes("→") });
    results.push({ name: "Stok < Eşik metni render edildi", pass: pageText.includes("Stok < Eşik - İç Uyarı") });
    // Raporlar
    results.push({ name: "Rapor: Kanal Bazlı Satış", pass: !!document.querySelector('[data-testid="report-channels"]') });

    // Sonucu yazdır
    // eslint-disable-next-line no-console
    console.table(results.map(r => ({ Test: r.name, Sonuc: r.pass ? "PASS" : "FAIL" })));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Smoke test hata:", e);
  }
}

// ---- Demo veri üreticiler (faker'sız hafif) ----
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function genCampaigns(n = 3){
  const objs = ["Click-to-WhatsApp","Click-to-DM","Conversions"]; 
  return Array.from({length: n}).map((_,i)=>({
    name: `${pick(["CTWA","IG DM","Retarget"]) } ${pick(["Agridin","Rebours","Genel"])}`,
    budget: `₺${rand(400,1800).toLocaleString("tr-TR")}/gün`,
    obj: pick(objs),
    status: pick(["Aktif","Aktif","Durdu"]),
    roas: `${(Math.random()*2 + 1.5).toFixed(1)}x`
  }));
}

function genOrders(n=5){
  return Array.from({length:n}).map((_,i)=>({
    id: 1401 + i,
    customer: `Müşteri ${i+1}`,
    total: `₺${(rand(120, 980)).toLocaleString("tr-TR")}`,
    status: pick(["Hazırlanıyor","Kargoda","Teslim"]),
    carrier: pick(["Yurtiçi Kargo","Aras","MNG"])
  }));
}

function genChannelSales(){
  return [
    { channel: "WhatsApp", amount: rand(42000, 65000) },
    { channel: "Instagram", amount: rand(22000, 42000) },
    { channel: "Messenger", amount: rand(8000, 18000) },
  ];
}

function genFunnelSeries(days=7){
  const today = new Date();
  return Array.from({length: days}).map((_,i)=>{
    const d = new Date(today);
    d.setDate(today.getDate() - (days-1-i));
    const reklam = rand(500, 1000);
    const sohbet = Math.round(reklam * (0.18 + Math.random()*0.1));
    const sepet  = Math.round(sohbet * (0.35 + Math.random()*0.1));
    const siparis= Math.round(sepet  * (0.37 + Math.random()*0.1));
    return {
      day: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
      reklam, sohbet, sepet, siparis
    };
  });
}

export default function App() {
  const [role, setRole] = useState("admin"); // admin | agent

  // PWA: install prompt yakalama & SW kaydı (varsa)
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [swStatus, setSwStatus] = useState("pasif");

  useEffect(() => {
    // Mount sonrası smoke testleri çalıştır
    runSmokeTests();

    // PWA install prompt
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Service worker kaydı (manifest/sw varsa)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(() => setSwStatus("aktif"))
      .catch(() => setSwStatus("pasif"));
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    await pwaPrompt.userChoice;
    setPwaPrompt(null);
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* Üst bar: soft mavi→turuncu gradyan */}
      <div className="px-4 py-3 bg-gradient-to-r from-sky-500 to-orange-400 text-white flex items-center justify-between">
        <div className="font-bold">Omni‑Bot</div>
        <div className="flex items-center gap-2 text-xs">
          {pwaPrompt && (
            <button onClick={handleInstall} className="px-3 py-1 rounded-full bg-orange-400 text-white">Uygulamayı Yükle</button>
          )}
          <button onClick={() => setRole("admin")} className={`px-3 py-1 rounded-full ${role==="admin"?"bg-white text-sky-700":"bg-white/20"}`}>Admin</button>
          <button onClick={() => setRole("agent")} className={`px-3 py-1 rounded-full ${role==="agent"?"bg-white text-sky-700":"bg-white/20"}`}>Kullanıcı</button>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-hidden">
        {role === "admin" ? <AdminApp swStatus={swStatus}/> : <AgentApp/>}
      </div>
    </div>
  );
}

/******************** ADMIN (Web Panel) ********************/
function AdminApp({swStatus}){
  const [tab,setTab] = useState("dashboard");
  return (
    <div className="h-full flex">
      {/* Sol menü */}
      <aside className="w-60 bg-white border-r p-3 space-y-1 overflow-y-auto">
        <MenuItem current={tab} id="dashboard" onClick={setTab} icon={<Icon label="D"/>} title="Dashboard"/>
        <MenuItem current={tab} id="campaigns" onClick={setTab} icon={<Icon label="Ad"/>} title="Kampanyalar"/>
        <MenuItem current={tab} id="inbox" onClick={setTab} icon={<Icon label="In"/>} title="Omni‑Inbox"/>
        <MenuItem current={tab} id="catalog" onClick={setTab} icon={<Icon label="Pr"/>} title="Ürünler"/>
        <MenuItem current={tab} id="orders" onClick={setTab} icon={<Icon label="Or"/>} title="Siparişler"/>
        <MenuItem current={tab} id="automation" onClick={setTab} icon={<Icon label="Au"/>} title="Otomasyon"/>
        <MenuItem current={tab} id="reports" onClick={setTab} icon={<Icon label="Rp"/>} title="Raporlar"/>
        <MenuItem current={tab} id="settings" onClick={setTab} icon={<Icon label="St"/>} title="Ayarlar"/>
      </aside>

      {/* Sağ ana alan */}
      <main className="flex-1 overflow-y-auto p-4">
        {tab==="dashboard" && <AdminDashboard/>}
        {tab==="campaigns" && <AdminCampaigns/>}
        {tab==="inbox" && <AdminInbox/>}
        {tab==="catalog" && <AdminCatalog/>}
        {tab==="orders" && <AdminOrders/>}
        {tab==="automation" && <AdminAutomation/>}
        {tab==="reports" && <AdminReports/>}
        {tab==="settings" && <AdminSettings swStatus={swStatus}/>} 
      </main>
    </div>
  )
}

function MenuItem({current,id,onClick,icon,title}){
  const active = current===id;
  return (
    <button onClick={()=>onClick(id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${active?"bg-sky-50 text-sky-700":"hover:bg-gray-50"}`}>
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

function Card({children}){
  return <div className="bg-white border rounded-xl p-4 shadow-sm">{children}</div>
}

function Stat({label,value,sub}){
  return (
    <Card>
      <div className="text-xs" style={{color: THEME.grayText}}>{label}</div>
      <div className="text-2xl font-bold mt-1" style={{color: THEME.black}}>{value}</div>
      {sub && <div className="text-xs" style={{color: THEME.orange}}>{sub}</div>}
    </Card>
  )
}

function AdminDashboard(){
  const funnelData = useMemo(()=> genFunnelSeries(7), []);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Bugünkü Mesaj" value="128" sub="%12 ↑"/>
        <Stat label="Yeni Sipariş" value="36" sub="%7 ↑"/>
        <Stat label="ROAS" value="3.4x" sub="Son 7 gün"/>
        <Stat label="Düşük Stok" value="5 SKU"/>
      </div>
      <Card>
        <div className="font-semibold" style={{color: THEME.black}}>Huniler</div>
        <div className="text-sm" style={{color: THEME.grayText}} data-testid="admin-dashboard-funnels">Reklam - Sohbet - Sepet - Sipariş</div>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={funnelData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day"/>
              <YAxis/>
              <Tooltip/>
              <Legend/>
              <Line type="monotone" dataKey="reklam" stroke={THEME.blue} dot={false} />
              <Line type="monotone" dataKey="sohbet" stroke={THEME.orange} dot={false} />
              <Line type="monotone" dataKey="sepet" stroke={THEME.black} dot={false} />
              <Line type="monotone" dataKey="siparis" stroke={THEME.blueDark} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function AdminCampaigns(){
  const [rows] = useState(()=> genCampaigns(3));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold" style={{color: THEME.black}}>Kampanyalar</div>
        <button className="px-3 py-2 rounded-lg text-white text-sm bg-sky-600 hover:bg-sky-700">Yeni Kampanya</button>
      </div>
      <Card>
        <table className="w-full text-sm" data-testid="campaigns-table">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Ad</th>
              <th>Bütçe</th>
              <th>Hedef</th>
              <th>Durum</th>
              <th>ROAS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c,i)=> (
              <tr key={i} className="border-t">
                <td className="py-2">{c.name}</td>
                <td>{c.budget}</td>
                <td>{c.obj}</td>
                <td><span className={`px-2 py-1 text-xs rounded ${c.status==="Aktif"?"bg-sky-50 text-sky-700":"bg-gray-100"}`}>{c.status}</span></td>
                <td>{c.roas}</td>
                <td className="text-right"><button className="px-2 py-1 text-sky-700">Detay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AdminInbox(){
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[calc(100vh-160px)]">
      <Card>
        <div className="flex gap-2 mb-2">
          {["Tümü","WhatsApp","Instagram","Messenger"].map(x=>
            <button key={x} className="px-3 py-1 rounded-full bg-gray-100 text-xs hover:bg-sky-50 hover:text-sky-700">{x}</button>)}
        </div>
        <div className="space-y-2 overflow-y-auto h-[70vh] pr-1">
          {[1,2,3,4,5,6].map(i=> (
            <div key={i} className="p-2 rounded-lg border hover:bg-gray-50">
              <div className="text-sm font-medium" style={{color: THEME.black}}>Müşteri {i}</div>
              <div className="text-xs" style={{color: THEME.grayText}}>“Merhaba, fiyat alabilir miyim?”</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="font-semibold mb-2" style={{color: THEME.black}}>Sohbet</div>
        <div className="h-[60vh] overflow-y-auto space-y-2">
          {["Merhaba, ürünle ilgileniyorum","Buyrun yardımcı olayım"].map((m,idx)=> (
            <div key={idx} className={`max-w-[80%] p-2 rounded-lg ${idx%2?"bg-sky-50 ml-auto":"bg-gray-100"}`}>{m}</div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Mesaj yaz…"/>
          <button className="px-3 py-2 rounded-lg text-white text-sm bg-sky-600 hover:bg-sky-700">Gönder</button>
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <button className="px-2 py-1 rounded bg-gray-100 hover:bg-sky-50 hover:text-sky-700">Ürün Kartı</button>
          <button className="px-2 py-1 rounded bg-gray-100 hover:bg-orange-50 hover:text-orange-600">Ödeme Linki</button>
          <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-100">Kargo Sorgu</button>
        </div>
      </Card>
      <Card>
        <div className="font-semibold mb-2" style={{color: THEME.black}}>Müşteri Kartı</div>
        <div className="text-sm" style={{color: THEME.black}}>Nahit • 0532 xxx xx xx</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Son sipariş: #1452 (Kargoda)</div>
        <div className="mt-3">
          <div className="text-xs font-medium mb-1" style={{color: THEME.grayText}}>Geçmiş Siparişler</div>
          <div className="space-y-2 text-sm">
            <div className="p-2 border rounded">#1452 — ₺540 — Kargoda</div>
            <div className="p-2 border rounded">#1398 — ₺320 — Teslim</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AdminCatalog(){
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold" style={{color: THEME.black}}>Ürünler</div>
        <button className="px-3 py-2 rounded-lg text-white text-sm bg-sky-600 hover:bg-sky-700">Yeni Ürün</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4,5,6,7,8].map(i=> (
          <Card key={i}>
            <div className="h-24 rounded mb-2" style={{backgroundColor: "#e2e8f0"}}/>
            <div className="text-sm font-medium" style={{color: THEME.black}}>Ürün {i}</div>
            <div className="text-xs" style={{color: THEME.grayText}}>Stok: {20-i}</div>
            <div className="text-xs" style={{color: THEME.black}}>₺{i*120}</div>
            <button className="mt-2 px-3 py-1 text-xs rounded bg-gray-100 hover:bg-sky-50 hover:text-sky-700">Düzenle</button>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AdminOrders(){
  const [orders] = useState(()=> genOrders(5));
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold" style={{color: THEME.black}}>Siparişler</div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">#</th><th>Müşteri</th><th>Tutar</th><th>Durum</th><th>Kargo</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o,i)=> (
              <tr key={i} className="border-t">
                <td className="py-2">#{o.id}</td>
                <td>{o.customer}</td>
                <td>{o.total}</td>
                <td><span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded">{o.status}</span></td>
                <td>{o.carrier}</td>
                <td className="text-right"><button className="px-2 py-1 text-sky-700">Detay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AdminAutomation(){
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold" style={{color: THEME.black}}>Otomasyon Kuralları</div>
        <button className="px-3 py-2 rounded text-white text-sm bg-sky-600 hover:bg-sky-700">Yeni Kural</button>
      </div>
      <Card data-testid="automation-rule-1">
        <div className="text-sm font-medium" style={{color: THEME.black}}>Sepet Terk - Hatırlatma</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Tetikleyici: Sepet 30dk aktif, ödeme yok - Aksiyon: WhatsApp şablon gönder</div>
      </Card>
      <Card data-testid="automation-rule-2">
        <div className="text-sm font-medium" style={{color: THEME.black}}>Stok &lt; Eşik - İç Uyarı</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Tetikleyici: Stok 10 altı - Aksiyon: Slack/WhatsApp iç mesaj</div>
      </Card>
      <Card data-testid="automation-rule-3">
        <div className="text-sm font-medium" style={{color: THEME.black}}>“Kargom nerede?” - Takip Cevabı</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Tetikleyici: Anahtar kelime - Aksiyon: Kargo API’den durum çek ve yanıtla</div>
      </Card>
    </div>
  )
}

function AdminReports(){
  const channelData = useMemo(()=> genChannelSales(), []);
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold" style={{color: THEME.black}}>Raporlar</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card data-testid="report-channels">
          <div className="text-sm font-semibold" style={{color: THEME.black}}>Kanal Bazlı Satış</div>
          <ul className="mt-2 text-sm list-disc list-inside" style={{color: THEME.grayText}}>
            <li>WhatsApp: ₺{channelData[0].amount.toLocaleString("tr-TR")}</li>
            <li>Instagram: ₺{channelData[1].amount.toLocaleString("tr-TR")}</li>
            <li>Messenger: ₺{channelData[2].amount.toLocaleString("tr-TR")}</li>
          </ul>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel"/>
                <YAxis/>
                <Tooltip/>
                <Bar dataKey="amount" fill={THEME.blue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold" style={{color: THEME.black}}>Ajan Performansı</div>
          <ul className="mt-2 text-sm list-disc list-inside" style={{color: THEME.grayText}}>
            <li>Ayberk: 46 sipariş • 1.8dk ilk yanıt</li>
            <li>Gürdal: 37 sipariş • 2.4dk</li>
            <li>Merve: 29 sipariş • 2.0dk</li>
          </ul>
        </Card>
        <Card>
          <div className="text-sm font-semibold" style={{color: THEME.black}}>Ürün Performansı</div>
          <ul className="mt-2 text-sm list-disc list-inside" style={{color: THEME.grayText}}>
            <li>Agridin Krem: 82 adet</li>
            <li>Rebours Serum: 55 adet</li>
            <li>Hemorr Krem: 31 adet</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function AdminSettings({swStatus}){
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold" style={{color: THEME.black}}>Ayarlar</div>
      <Card>
        <div className="text-sm font-medium mb-2" style={{color: THEME.black}}>Kanallar</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Toggle label="WhatsApp"/>
          <Toggle label="Instagram"/>
          <Toggle label="Messenger"/>
          <Toggle label="E-posta"/>
        </div>
      </Card>
      <Card>
        <div className="text-sm font-medium mb-2" style={{color: THEME.black}}>Ödeme & Kargo</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Toggle label="iyzico"/>
          <Toggle label="PayTR"/>
          <Toggle label="Stripe"/>
          <Toggle label="Yurtiçi/Aras/MNG"/>
        </div>
      </Card>
      <Card>
        <div className="text-sm font-medium mb-1" style={{color: THEME.black}}>PWA Durumu</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Servis çalışanı: <b>{swStatus}</b> (Manifest/SW dosyası varsa aktif olur)</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Yükleme düğmesi: Üst barda uygun cihazlarda görünür.</div>
      </Card>
    </div>
  )
}

function Toggle({label}){
  const [on,setOn] = useState(true);
  return (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <span style={{color: THEME.black}}>{label}</span>
      <button onClick={()=>setOn(!on)} className={`w-10 h-6 rounded-full relative ${on?"bg-sky-500":"bg-gray-300"}`}>
        <span className={`absolute top-0.5 ${on?"right-0.5":"left-0.5"} w-5 h-5 bg-white rounded-full transition-all`}></span>
      </button>
    </div>
  )
}

/******************** AGENT (Mobil) ********************/
function AgentApp(){
  const [tab,setTab] = useState("messages");
  return (
    <div className="h-full flex flex-col">
      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab==="messages" && <AgentInbox/>}
        {tab==="catalog" && <AgentCatalog/>}
        {tab==="orders" && <AgentOrders/>}
        {tab==="tasks" && <AgentTasks/>}
        {tab==="profile" && <AgentProfile/>}
      </div>
      {/* Alt menü */}
      <div className="grid grid-cols-5 bg-white border-t">
        {[
          {id:"messages",label:"Mesaj"},
          {id:"catalog",label:"Katalog"},
          {id:"orders",label:"Sipariş"},
          {id:"tasks",label:"Görev"},
          {id:"profile",label:"Profil"},
        ].map(i=> (
          <button key={i.id} onClick={()=>setTab(i.id)} className={`py-2 text-sm ${tab===i.id?"text-sky-700":"text-gray-500"}`}>{i.label}</button>
        ))}
      </div>
    </div>
  )
}

function AgentInbox(){
  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-2">
        {["Tümü","WA","IG","MS"].map(x=> <button key={x} className="px-3 py-1 rounded-full bg-gray-100 text-xs hover:bg-sky-50 hover:text-sky-700">{x}</button>)}
      </div>
      {[1,2,3,4].map(i=> (
        <div key={i} className="p-3 bg-white border rounded-xl">
          <div className="flex justify-between">
            <div>
              <div className="text-sm font-medium" style={{color: THEME.black}}>Müşteri {i}</div>
              <div className="text-xs" style={{color: THEME.grayText}}>“Fiyat bilgisi alabilir miyim?”</div>
            </div>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-1 rounded">WhatsApp</span>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <button className="px-2 py-1 rounded bg-gray-100 hover:bg-sky-50 hover:text-sky-700">Ürün Kartı</button>
            <button className="px-2 py-1 rounded bg-gray-100 hover:bg-orange-50 hover:text-orange-600">Ödeme Linki</button>
            <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-100">Kargo Sorgu</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AgentCatalog(){
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4].map(i=> (
        <div key={i} className="bg-white border rounded-xl p-3">
          <div className="h-20 bg-gray-100 rounded mb-2"/>
          <div className="text-sm font-medium" style={{color: THEME.black}}>Ürün {i}</div>
          <div className="text-xs" style={{color: THEME.grayText}}>₺{i*99}</div>
          <button className="w-full mt-2 px-3 py-2 rounded-lg text-white text-xs bg-sky-600 hover:bg-sky-700">Sepete Ekle</button>
        </div>
      ))}
    </div>
  )
}

function AgentOrders(){
  return (
    <div className="space-y-2">
      {[1,2,3].map(i=> (
        <div key={i} className="p-3 bg-white border rounded-xl flex justify-between">
          <div>
            <div className="text-sm font-medium" style={{color: THEME.black}}>#ORD‑{1400+i}</div>
            <div className="text-xs" style={{color: THEME.grayText}}>Kargoda • Yurtiçi</div>
          </div>
          <button className="px-3 py-2 rounded bg-gray-100 text-xs hover:bg-sky-50 hover:text-sky-700">Detay</button>
        </div>
      ))}
    </div>
  )
}

function AgentTasks(){
  return (
    <div className="space-y-2">
      {["Sepet terk hatırlatma","Stok uyarı takip","Kargo gecikme araması"].map((t,i)=> (
        <div key={i} className="p-3 bg-white border rounded-xl flex items-center justify-between">
          <div className="text-sm" style={{color: THEME.black}}>{t}</div>
          <button className="px-3 py-2 rounded text-white text-xs bg-orange-500 hover:bg-orange-600">Yapıldı</button>
        </div>
      ))}
    </div>
  )
}

function AgentProfile(){
  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3">
        <div className="text-sm font-semibold" style={{color: THEME.black}}>Nahit • Admin</div>
        <div className="text-xs" style={{color: THEME.grayText}}>Ortalama ilk yanıt: 1.9dk</div>
      </div>
      <button className="w-full px-3 py-2 rounded bg-gray-100 text-sm hover:bg-sky-50 hover:text-sky-700">Ayarlar</button>
      <button className="w-full px-3 py-2 rounded bg-red-50 text-red-600 text-sm">Çıkış</button>
    </div>
  )
}

/* =========================
   PWA EKLERI (DOSYA ICERIKLERI)
   =========================
   Asagidaki dosyalari olusturup projeye ekleyin.
   Vite icin public/ altindaki dosyalar build'e otomatik kopyalanir.
*/

/* ===== FILE: public/manifest.webmanifest =====
{
  "name": "Omni-Bot",
  "short_name": "OmniBot",
  "description": "Omni-channel CRM: Reklam - Sohbet - Sepet - Siparis",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "lang": "tr-TR",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
*/

/* ===== FILE: public/sw.js =====
// Basit servis calisani: app-shell'i cache'ler, offline'da index.html'e duser
const CACHE = 'omnibot-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    // HTML isteklerinde network-first, dusus: index.html
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Digerleri icin cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
*/

/* ===== FILE: index.html (HEAD icine EKLEYIN) =====
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#0ea5e9" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
*/

/* ===== NOT =====
1) /public/icons/ klasorune en az iki ikon ekleyin: icon-192.png ve icon-512.png
   (Gecici olarak tek renkli PNG de kullanabilirsiniz.)
2) Service Worker gelistirme modunda kisitli calisir; asil amaci prod build.
   Prod test icin: npm run build && statik bir sunucuda (veya Docker Nginx) servis edin.
*/
