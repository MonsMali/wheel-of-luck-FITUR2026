'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with browser APIs
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-white text-xl">Cargando panel...</div>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminDashboard />;
}
