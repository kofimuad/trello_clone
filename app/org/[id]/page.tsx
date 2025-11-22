// app/org/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/navbar';
import InviteMembersModal from '@/components/InviteMembersModal';
import { Organization, OrganizationMemberWithUser, OrganizationInvite } from '@/types';

interface Member {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export default function OrganizationDetailPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchOrganizationData();
  }, [isLoaded, user, orgId]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch organization details
      const orgResponse = await fetch(`/api/organizations/${orgId}`);
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization');
      }
      const orgData = await orgResponse.json();
      setOrganization(orgData.organization);
      setUserRole(orgData.userRole);

      // Fetch members
      const membersResponse = await fetch(`/api/organizations/${orgId}/members`);
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
      }

      // Fetch pending invites (only if user is owner)
      if (orgData.userRole === 'owner') {
        const invitesResponse = await fetch(`/api/organizations/${orgId}/invites`);
        if (invitesResponse.ok) {
          const invitesData = await invitesResponse.json();
          setPendingInvites(invitesData.invites || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSent = (invite: OrganizationInvite) => {
    setPendingInvites([invite, ...pendingInvites]);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Cancel this invite?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel invite');
      }

      setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel invite');
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-gray-600 mt-1">
              Created {new Date(organization.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/org/${orgId}/boards`)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              View Boards
            </button>
            {userRole === 'owner' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                + Invite Members
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Members Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Members ({members.length})</h2>

              {members.length === 0 ? (
                <p className="text-gray-600">No members yet</p>
              ) : (
                <div className="space-y-4">
                  {members.map(member => (
                    <div key={member.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user_id}
                          {member.role === 'owner' && (
                            <span className="ml-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                              Owner
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      {userRole === 'owner' && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invites Section (only show to owner) */}
            {userRole === 'owner' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Invites ({pendingInvites.length})</h2>

                {pendingInvites.length === 0 ? (
                  <p className="text-gray-600">No pending invites</p>
                ) : (
                  <div className="space-y-4">
                    {pendingInvites.map(invite => (
                      <div key={invite.id} className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <p className="font-medium text-gray-900">{invite.email}</p>
                          <p className="text-sm text-gray-600">
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Role: {invite.role}</p>
                        </div>
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Organization Info</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Your Role</p>
                  <p className="font-medium text-gray-900 capitalize">{userRole}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Members</p>
                  <p className="font-medium text-gray-900">{members.length}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Pending Invites</p>
                  <p className="font-medium text-gray-900">{pendingInvites.length}</p>
                </div>

                <hr className="my-4" />

                {userRole === 'owner' && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                  >
                    Invite Members
                  </button>
                )}

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMembersModal
          organizationId={orgId}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={handleInviteSent}
        />
      )}
    </div>
  );
}