import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders, AppRoutes, makeQueryClient } from '@/App';
import { DemoRepository } from '@/data/demo/DemoRepository';
import { DemoAuth } from '@/data/auth/demoAuth';
import { __fresh, __setDB } from '@/data/demo/store';
import { SCREENS } from '@/config/routes';

class IO { observe() {} disconnect() {} unobserve() {} }
class RO { observe() {} disconnect() {} unobserve() {} }
Object.assign(globalThis, { IntersectionObserver: IO, ResizeObserver: RO });
Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
window.scrollTo = () => {};

function renderAt(path: string, locale: 'tr' | 'en' = 'tr') {
  localStorage.setItem('sf.prefs', JSON.stringify({ locale, chosen: true, country: 'TR' }));
  const auth = new DemoAuth();
  const repo = new DemoRepository(() => localStorage.getItem('sf.demo.session'), 0);
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
      <AppProviders client={makeQueryClient()} auth={auth} repo={repo}>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); __setDB(__fresh()); });

describe('screen inventory', () => {
  it('lists 113 unique screens with routes', () => {
    expect(SCREENS).toHaveLength(113);
    expect(new Set(SCREENS.map((s) => s.no)).size).toBe(113);
    expect(new Set(SCREENS.map((s) => s.key)).size).toBe(113);
  });
});

describe('app integration (demo mode)', () => {
  it('first-time visitors land on the marketing page', async () => {
    localStorage.clear();
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/']}>
        <AppProviders client={makeQueryClient()} auth={new DemoAuth()} repo={new DemoRepository(() => null, 0)}><AppRoutes /></AppProviders>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /Etkinin gelire|Where Influence/ })).toBeInTheDocument();
  });

  it('home feed renders sample posts with disclosure and sample labels', async () => {
    renderAt('/');
    const articles = await screen.findAllByRole('article');
    expect(articles.length).toBeGreaterThan(3);
    expect(screen.getAllByText('Örnek').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Affiliate bağlantı').length).toBeGreaterThan(0);
  });

  it('guests are prompted to sign in when liking', async () => {
    renderAt('/');
    const first = (await screen.findAllByRole('article'))[0]!;
    await userEvent.click(within(first).getByRole('button', { name: 'Beğen' }));
    expect(await screen.findByText('Devam etmek için giriş yapın')).toBeInTheDocument();
  });

  it('product page shows offers for the selected country with a fair best-price label', async () => {
    renderAt('/product/pr_watch');
    expect(await screen.findByText('Satıcı teklifleri')).toBeInTheDocument();
    expect(await screen.findAllByText('En iyi fiyat')).toHaveLength(1);
    expect(screen.getAllByText('Nova Market').length).toBeGreaterThan(0);
  });

  it('withholds best-price label when data is incomplete', async () => {
    renderAt('/product/pr_headphones');
    expect(await screen.findByText(/adil bir karşılaştırma için yeterli olmadığından/)).toBeInTheDocument();
    expect(screen.queryByText('En iyi fiyat')).toBeNull();
    expect(screen.getAllByText('Tahmini fiyat').length).toBeGreaterThan(0);
  });

  it('renders in English', async () => {
    renderAt('/explore', 'en');
    expect(await screen.findByText('Trending creators')).toBeInTheDocument();
  });

  it('protected routes redirect guests to sign-in', async () => {
    renderAt('/messages');
    expect(await screen.findByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeInTheDocument();
  });

  it('planned screens render an honest status page inside their shell', async () => {
    renderAt('/brand/campaigns');
    // brand portal requires sign-in
    expect(await screen.findByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeInTheDocument();
  });

  it('creator profile route resolves @handles', async () => {
    renderAt('/@elif.stil');
    expect(await screen.findByRole('heading', { name: /Elif Aydın/ })).toBeInTheDocument();
  });
});
