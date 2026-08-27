
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/AuthContext';
import { DataFreshnessProvider } from '@/contexts/DataFreshnessContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { QueryErrorBoundary } from '@/components/QueryErrorBoundary';
import SystemHealth from '@/pages/SystemHealth';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Dashboard from '@/pages/Index';
import Monitoring from '@/pages/Monitoring';
import Auth from '@/pages/Auth';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataFreshnessProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <QueryErrorBoundary>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Navigate to="/signals" replace />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/signals" element={
                    <ProtectedRoute>
                      <Signals />
                    </ProtectedRoute>
                  } />
                  <Route path="/system-health" element={
                    <ProtectedRoute>
                      <SystemHealth />
                    </ProtectedRoute>
                  } />
                  <Route path="/monitoring" element={
                    <ProtectedRoute>
                      <Monitoring />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                </Routes>
              </QueryErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </DataFreshnessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
