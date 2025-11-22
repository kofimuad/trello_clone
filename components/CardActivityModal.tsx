// components/CardActivityModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { TaskActivity } from '@/types';

interface CardActivityModalProps {
  cardId: string;
  cardTitle: string;
  boardId: string;
  listId: string;
  onClose: () => void;
}

export default function CardActivityModal({
  cardId,
  cardTitle,
  boardId,
  listId,
  onClose,
}: CardActivityModalProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [cardId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/activities`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'updated':
        return 'bg-blue-50 border-blue-200';
      case 'moved':
        return 'bg-yellow-50 border-yellow-200';
      case 'deleted':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'moved':
        return 'bg-yellow-100 text-yellow-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity History</h2>
            <p className="text-gray-600 text-sm mt-1">"{cardTitle}"</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No activities yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className={`border rounded-lg p-4 ${getActionColor(activity.action)}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-block px-3 py-1 rounded text-xs font-semibold ${getActionBadgeColor(
                      activity.action
                    )}`}
                  >
                    {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {activity.changed_by}
                    </p>
                    {activity.details && (
                      <p className="text-sm text-gray-700 mt-1">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}