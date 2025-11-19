'use client';

import { Organization } from '@/types';
import Link from 'next/link';
import { useState } from 'react';

interface OrganizationCardProps {
  organization: Organization;
  onDeleted: (orgId: string) => void;
}

export default function OrganizationCard({ organization, onDeleted }: OrganizationCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete organization');
      }

      onDeleted(organization.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete organization');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-gray-900">{organization.name}</h3>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-gray-400 hover:text-red-600 transition"
          title="Delete organization"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Created {new Date(organization.created_at).toLocaleDateString()}
      </p>

      <Link
        href={`/org/${organization.id}`}
        className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition mb-2"
      >
        View Organization
      </Link>

      {showDeleteConfirm && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-3">Delete this organization?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              className="flex-1 px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm rounded transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}