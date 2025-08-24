import { useState } from 'react';

export const useNavigation = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const navigate = (path: string) => {
    // Extract page name from path
    const page = path.replace('/', '') || 'dashboard';
    setCurrentPage(page);
  };

  return {
    currentPage,
    navigate
  };
};