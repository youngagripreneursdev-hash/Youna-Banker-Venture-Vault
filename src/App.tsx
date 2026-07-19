import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useStore } from '@/store/useStore';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { startAnalyticsSnapshots, stopAnalyticsSnapshots } from '@/analytics/analyticsService';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Home } from '@/pages/Home';
import { Market } from '@/pages/Market';
import { BusinessDetail } from '@/pages/BusinessDetail';
import { WebBank } from '@/pages/WebBank';
import { BankerLogin } from '@/pages/BankerLogin';
import { BankerDashboard } from '@/pages/BankerDashboard';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';
import { Card } from '@/pages/Card';
import { Profile } from '@/pages/Profile';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Messages } from '@/pages/Messages';
import { Investing } from '@/pages/Investing';
import { Transact } from '@/pages/Transact';
import { Analytics } from '@/pages/Analytics';
import { Portfolio } from '@/pages/Portfolio';
import { Activity } from '@/pages/Activity';
import { ListBusiness } from '@/pages/ListBusiness';
import './App.css';

function DataBootstrap({ children }: { children: React.ReactNode }) {
  const { syncFromSupabase: syncStore } = useStore();

  // Sync from Supabase on mount if configured, then seed demo data once
  // when the platform is still empty (a successful sync with real data
  // suppresses seeding). Disable with VITE_ENABLE_DEMO_SEED=false.
  useEffect(() => {
    const maybeSeedDemo = () => {
      if (import.meta.env.VITE_ENABLE_DEMO_SEED === 'false') return;
      const store = useStore.getState();
      if (store.businesses.length === 0 && store.users.length <= 1) {
        store.seedDemoData();
      }
    };
    if (isSupabaseConfigured) {
      void syncStore().finally(maybeSeedDemo);
    } else {
      maybeSeedDemo();
    }
  }, []);

  // Start analytics snapshots
  useEffect(() => {
    startAnalyticsSnapshots(() => {
      const store = useStore.getState();
      return store.businesses.map((b) => ({
        id: b.id, name: b.name, velocityScore: b.velocityScore,
        confidencePrice: b.confidencePrice, healthScore: b.healthScore,
        netEntries: b.netEntries, currentBets: b.currentBets,
        settledBets: b.settledBets, totalRevenue: b.totalRevenue,
        color: b.color,
      }));
    });
    return () => stopAnalyticsSnapshots();
  }, []);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function BankerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBanker, isAdminAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isBanker) return <Navigate to="/" replace />;
  if (!isAdminAuthenticated) return <Navigate to="/banker-login" replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <BrowserRouter>
      <DataBootstrap>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
          <Route path="/business/:id" element={<ProtectedRoute><BusinessDetail /></ProtectedRoute>} />
          <Route path="/webbank" element={<ProtectedRoute><WebBank /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/card" element={<ProtectedRoute><Card /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/investing" element={<ProtectedRoute><Investing /></ProtectedRoute>} />
          <Route path="/transact" element={<ProtectedRoute><Transact /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
          <Route path="/list-business" element={<ProtectedRoute><ListBusiness /></ProtectedRoute>} />
          <Route path="/banker-login" element={<BankerLogin />} />
          <Route path="/banker" element={<BankerProtectedRoute><BankerDashboard /></BankerProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DataBootstrap>
      <SpeedInsights />
    </BrowserRouter>
  );
}

export default App;
