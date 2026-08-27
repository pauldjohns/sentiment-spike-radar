
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminPanel } from '@/components/AdminPanel';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, approved')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setIsAdmin(data?.role === 'admin' && data?.approved === true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify admin permissions',
          variant: 'destructive',
        });
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, toast]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        <AdminPanel />
      </div>
    </div>
  );
};

export default Admin;
