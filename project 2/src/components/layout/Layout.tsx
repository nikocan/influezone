import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  activeItem: string;
  onNavigate: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeItem, onNavigate }) => {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar activeItem={activeItem} onItemClick={onNavigate} />
      <Header />
      <main className="ml-64 pt-20 p-6">
        {children}
      </main>
    </div>
  );
};