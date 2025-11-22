// components/DraggableCard.tsx
'use client';

import { Task } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{card.title}</p>
          {card.description && (
            <p className="text-sm text-gray-600 mt-1">{card.description}</p>
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
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}