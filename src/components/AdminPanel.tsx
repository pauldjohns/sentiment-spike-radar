
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, UserCheck, Users, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  approved: boolean;
  created_at: string;
  approved_at?: string;
}

export const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Show access denied if user is not an admin
  if (!adminLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shield className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400">You don't have permission to access this admin panel.</p>
      </div>
    );
  }

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profiles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User approved successfully',
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      });
    }
  };

  const revokeApproval = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User approval revoked',
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error revoking approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke approval',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const pendingUsers = profiles.filter(p => !p.approved);
  const approvedUsers = profiles.filter(p => p.approved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCheck className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">User Management</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-red-900/30 text-red-400 border-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            {pendingUsers.length} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {approvedUsers.length} Approved
          </Badge>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Pending Approval</h3>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-white">{profile.full_name || profile.email}</p>
                  <p className="text-sm text-slate-400">{profile.email}</p>
                  <p className="text-xs text-slate-500">
                    Registered: {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => approveUser(profile.id)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Approved Users</h3>
        </div>
        <div className="space-y-3">
          {approvedUsers.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-white">{profile.full_name || profile.email}</p>
                  {profile.role === 'admin' && (
                    <Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-600 text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-400">{profile.email}</p>
                <p className="text-xs text-slate-500">
                  Approved: {profile.approved_at ? new Date(profile.approved_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {profile.id !== user?.id && (
                <Button
                  onClick={() => revokeApproval(profile.id)}
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-900/30"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
