// components/DroppableList.tsx
'use client';

import { SectionalColumn, Task } from '@/types';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DraggableCard from './DraggableCard';

interface DroppableListProps {
  list: SectionalColumn & { tasks?: Task[] };
  boardId: string;
  onDeleteList: (listId: string) => void;
  onAddCard: () => void;
  onDeleteCard: (listId: string, cardId: string) => void;
}

export default function DroppableList({
  list,
  boardId,
  onDeleteList,
  onAddCard,
  onDeleteCard,
}: DroppableListProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    attributes,
    listeners,
  } = useSortable({
    id: `list-${list.id}`,
    data: {
      type: 'List',
      list,
    },
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
      className={`flex-shrink-0 w-80 bg-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing ${
        isOver ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* List Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">{list.title}</h2>
        <button
          onClick={() => onDeleteList(list.id)}
          className="text-gray-500 hover:text-red-600 text-xl"
        >
          ×
        </button>
      </div>

      {/* Cards Container */}
      <SortableContext
        items={list.tasks?.map(t => `card-${t.id}`) || []}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-96">
          {list.tasks && list.tasks.length > 0 ? (
            list.tasks.map(card => (
              <DraggableCard
                key={card.id}
                card={card}
                listId={list.id}
                boardId={boardId}
                onDelete={() => onDeleteCard(list.id, card.id)}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">No cards yet</p>
          )}
        </div>
      </SortableContext>

      {/* Add Card Button */}
      <button
        onClick={onAddCard}
        className="w-full mt-4 p-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition"
      >
        + Add Card
      </button>
    </div>
  );
}