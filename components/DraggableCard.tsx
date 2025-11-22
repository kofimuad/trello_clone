// components/DraggableCard.tsx
'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CardActivityModal from './CardActivityModal';

interface DraggableCardProps {
  card: Task;
  listId: string;
  boardId: string;
  onDelete: () => void;
}

export default function DraggableCard({
  card,
  listId,
  boardId,
  onDelete,
}: DraggableCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isCompleted, setIsCompleted] = useState(card.completed || false);
  const [updatingCompletion, setUpdatingCompletion] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleComplete = async () => {
    try {
      setUpdatingCompletion(true);
      const response = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${card.id}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !isCompleted }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update card');
      }

      setIsCompleted(!isCompleted);
    } catch (err) {
      console.error('Failed to update completion status:', err);
      alert('Failed to update card status');
    } finally {
      setUpdatingCompletion(false);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2 flex-1">
            <button
              onClick={handleToggleComplete}
              disabled={updatingCompletion}
              className="mt-1 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition disabled:opacity-50"
              title={isCompleted ? 'Mark as incomplete' : 'Mark as done'}
            >
              {isCompleted && <span className="text-green-600 text-sm">✓</span>}
            </button>
            <div className="flex-1">
              <p
                className={`font-medium ${
                  isCompleted
                    ? 'text-gray-500 line-through'
                    : 'text-gray-900'
                }`}
              >
                {card.title}
              </p>
              {card.description && (
                <p className={`text-sm mt-1 ${
                  isCompleted
                    ? 'text-gray-400 line-through'
                    : 'text-gray-600'
                }`}>
                  {card.description}
                </p>
              )}
              {card.priority && (
                <span
                  className={`inline-block text-xs font-semibold mt-2 px-2 py-1 rounded ${
                    card.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : card.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {card.priority}
                </span>
              )}
              {card.due_date && (
                <p className="text-xs text-gray-500 mt-2">
                  Due: {new Date(card.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <button
              onClick={() => setShowHistory(true)}
              className="text-gray-400 hover:text-blue-600 text-sm"
              title="View history"
            >
              📋
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <CardActivityModal
          cardId={card.id}
          cardTitle={card.title}
          boardId={boardId}
          listId={listId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}