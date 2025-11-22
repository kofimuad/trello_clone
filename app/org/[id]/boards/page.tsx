// app/org/[id]/boards/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/navbar';
import CreateBoardModal from '@/components/CreateBoardModal';
import { Organization, Board } from '@/types';

export default function OrganizationBoardsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchData();
  }, [isLoaded, user, orgId, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch organization
      const orgResponse = await fetch(`/api/organizations/${orgId}`);
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization');
      }
      const orgData = await orgResponse.json();
      setOrganization(orgData.organization);
      setUserRole(orgData.userRole);

      // Fetch boards
      const boardsResponse = await fetch(`/api/organizations/${orgId}/boards`);
      if (boardsResponse.ok) {
        const boardsData = await boardsResponse.json();
        setBoards(boardsData.boards || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBoardCreated = (newBoard: Board) => {
    setBoards([...boards, newBoard]);
    setShowCreateModal(false);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete board');
      }

      setBoards(boards.filter(b => b.id !== boardId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete board');
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
          <p className="text-gray-600">Loading boards...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push(`/org/${orgId}`)}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
            >
              ← Back to Organization
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{organization?.name}</h1>
            <p className="text-gray-600 mt-1">Boards</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            + New Board
          </button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
            <p className="text-gray-600 mb-6">Create your first board to get started!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition inline-block"
            >
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map(board => (
              <div
                key={board.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
              >
                <div
                  className="h-24"
                  style={{ backgroundColor: board.color || '#3b82f6' }}
                />
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{board.title}</h3>
                  {board.description && (
                    <p className="text-gray-600 text-sm mb-4">{board.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/board/${board.id}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition"
                    >
                      Open Board
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={() => handleDeleteBoard(board.id)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          organizationId={orgId}
          onClose={() => setShowCreateModal(false)}
          onBoardCreated={handleBoardCreated}
        />
      )}
    </div>
  );
}