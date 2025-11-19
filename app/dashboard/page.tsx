'use client';

import Navbar from '@/components/navbar';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateOrgModal from '@/components/CreateOrgModal';
import OrganizationCard from '@/components/OrganizationCard';
import { Organization } from '@/types';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchOrganizations();
  }, [isLoaded, user, router]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/organizations');

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgCreated = (newOrg: Organization) => {
    setOrganizations([...organizations, newOrg]);
    setShowCreateModal(false);
  };

  const handleOrgDeleted = (orgId: string) => {
    setOrganizations(organizations.filter(org => org.id !== orgId));
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName ?? user?.emailAddresses[0].emailAddress}!👋
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              + New Organization
            </button>
          </div>
          <p className="text-gray-600">Here's what's happening with your boards today.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Organizations Section */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading your organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No organizations yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first organization to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition inline-block"
            >
              Create Organization
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Organizations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map(org => (
                <OrganizationCard
                  key={org.id}
                  organization={org}
                  onDeleted={handleOrgDeleted}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrgModal
          onClose={() => setShowCreateModal(false)}
          onOrgCreated={handleOrgCreated}
        />
      )}
    </div>
  );
}