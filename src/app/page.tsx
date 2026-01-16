'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser APIs
const GamePage = dynamic(() => import('@/components/GamePage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-700 flex items-center justify-center">
      <div className="text-white text-xl">Cargando...</div>
    </div>
  ),
});

export default function Home() {
  return <GamePage />;
}
