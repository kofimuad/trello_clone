// app/board/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/navbar';
import CreateListModal from '@/components/CreateListModal';
import CreateCardModal from '@/components/CreateCardModal';
import DroppableList from '@/components/DroppableList';
import DraggableCard from '@/components/DraggableCard';
import { Board, SectionalColumn, Task } from '@/types';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface ListWithCards extends SectionalColumn {
  tasks?: Task[];
}

export default function BoardDetailPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Sensors hook - inside component after state
  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchBoardData();
  }, [isLoaded, user, boardId, router]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch board details
      const boardResponse = await fetch(`/api/boards/${boardId}`);
      if (!boardResponse.ok) {
        throw new Error('Failed to fetch board');
      }
      const boardData = await boardResponse.json();
      setBoard(boardData.board);

      // Fetch lists with cards
      const listsResponse = await fetch(`/api/boards/${boardId}/lists`);
      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        setLists(listsData.lists || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a list
    if (activeId.startsWith('list-')) {
      const activeListId = activeId.replace('list-', '');
      const overListId = overId.startsWith('list-') 
        ? overId.replace('list-', '')
        : overId.startsWith('card-')
        ? lists.find(l => l.tasks?.some(t => `card-${t.id}` === overId))?.id
        : null;

      if (overListId && activeListId !== overListId) {
        const activeIndex = lists.findIndex(l => l.id === activeListId);
        const overIndex = lists.findIndex(l => l.id === overListId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newLists = arrayMove(lists, activeIndex, overIndex);
          setLists(newLists);

          // Update sort order on server
          newLists.forEach((list, index) => {
            updateListSortOrder(list.id, index);
          });
        }
      }
    }
    // Check if we're dragging a card
    else if (activeId.startsWith('card-') && overId) {
      const cardId = activeId.replace('card-', '');
      const overListId = overId.startsWith('list-')
        ? overId.replace('list-', '')
        : overId.startsWith('card-')
        ? lists.find(l => l.tasks?.some(t => `card-${t.id}` === overId))?.id
        : null;

      if (!overListId) return;

      // Find the card and its current list
      let sourceListId: string | null = null;
      let cardToMove: Task | null = null;

      for (const list of lists) {
        const card = list.tasks?.find(t => t.id === cardId);
        if (card) {
          sourceListId = list.id;
          cardToMove = card;
          break;
        }
      }

      if (!sourceListId || !cardToMove) return;

      // If moving to the same list, reorder cards
      if (sourceListId === overListId) {
        setLists(
          lists.map(list => {
            if (list.id === sourceListId && list.tasks) {
              const activeIndex = list.tasks.findIndex(t => t.id === cardId);
              const overIndex = list.tasks.findIndex(
                t => `card-${t.id}` === overId || t.id === overId.replace('card-', '')
              );

              if (activeIndex !== -1 && overIndex !== -1) {
                const newTasks = arrayMove(list.tasks, activeIndex, overIndex);
                return { ...list, tasks: newTasks };
              }
            }
            return list;
          })
        );

        // Update sort orders
        const updatedList = lists.find(l => l.id === sourceListId);
        if (updatedList?.tasks) {
          updatedList.tasks.forEach((task, index) => {
            updateCardSortOrder(cardId, sourceListId, index);
          });
        }
      } else {
        // Moving to a different list
        setLists(
          lists.map(list => {
            if (list.id === sourceListId && list.tasks) {
              return {
                ...list,
                tasks: list.tasks.filter(t => t.id !== cardId),
              };
            }
            if (list.id === overListId && list.tasks) {
              const overIndex = list.tasks.findIndex(
                t => `card-${t.id}` === overId || t.id === overId.replace('card-', '')
              );
              const newTasks = [...list.tasks];
              newTasks.splice(
                overIndex === -1 ? newTasks.length : overIndex,
                0,
                cardToMove
              );
              return { ...list, tasks: newTasks };
            }
            return list;
          })
        );

        // Update card's list on server
        updateCardList(cardId, sourceListId, overListId);
      }
    }
  };

  const updateListSortOrder = async (listId: string, newSortOrder: number) => {
    try {
      await fetch(`/api/boards/${boardId}/lists/${listId}/sort`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newSortOrder }),
      });
    } catch (err) {
      console.error('Failed to update list sort order:', err);
    }
  };

  const updateCardSortOrder = async (
    cardId: string,
    listId: string,
    newSortOrder: number
  ) => {
    try {
      await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/sort`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newSortOrder }),
      });
    } catch (err) {
      console.error('Failed to update card sort order:', err);
    }
  };

  const updateCardList = async (
    cardId: string,
    sourceListId: string,
    targetListId: string
  ) => {
    try {
      await fetch(`/api/boards/${boardId}/lists/${sourceListId}/cards/${cardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_list_id: targetListId }),
      });
    } catch (err) {
      console.error('Failed to move card:', err);
    }
  };

  const handleListCreated = (newList: ListWithCards) => {
    setLists([...lists, newList]);
    setShowCreateListModal(false);
  };

  const handleCardCreated = (listId: string, newCard: Task) => {
    setLists(
      lists.map(list =>
        list.id === listId
          ? { ...list, tasks: [...(list.tasks || []), newCard] }
          : list
      )
    );
    setShowCreateCardModal(false);
    setSelectedListId(null);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Delete this list? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete list');
      }

      setLists(lists.filter(l => l.id !== listId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete list');
    }
  };

  const handleDeleteCard = async (listId: string, cardId: string) => {
    if (!confirm('Delete this card?')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      setLists(
        lists.map(list =>
          list.id === listId
            ? { ...list, tasks: list.tasks?.filter(t => t.id !== cardId) }
            : list
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete card');
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
          <p className="text-gray-600">Loading board...</p>
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

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Board not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: board.color || '#f3f4f6' }}>
      <Navbar />

      <div className="px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">{board.title}</h1>
            {board.description && (
              <p className="text-gray-200 mt-1">{board.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowCreateListModal(true)}
            className="bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg transition"
          >
            + Add List
          </button>
        </div>

        {/* Lists Container with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-8">
            {lists.length === 0 ? (
              <div className="text-center py-12 bg-white bg-opacity-20 rounded-lg p-8 text-white">
                <h3 className="text-lg font-medium mb-2">No lists yet</h3>
                <p className="mb-6">Create your first list to get started!</p>
                <button
                  onClick={() => setShowCreateListModal(true)}
                  className="bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-6 rounded-lg transition"
                >
                  Create List
                </button>
              </div>
            ) : (
              <SortableContext
                items={lists.map(l => `list-${l.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {lists.map(list => (
                  <DroppableList
                    key={list.id}
                    list={list}
                    boardId={boardId}
                    onDeleteList={handleDeleteList}
                    onAddCard={() => {
                      setSelectedListId(list.id);
                      setShowCreateCardModal(true);
                    }}
                    onDeleteCard={handleDeleteCard}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </DndContext>
      </div>

      {/* Create List Modal */}
      {showCreateListModal && (
        <CreateListModal
          boardId={boardId}
          onClose={() => setShowCreateListModal(false)}
          onListCreated={handleListCreated}
        />
      )}

      {/* Create Card Modal */}
      {showCreateCardModal && selectedListId && (
        <CreateCardModal
          listId={selectedListId}
          boardId={boardId}
          onClose={() => {
            setShowCreateCardModal(false);
            setSelectedListId(null);
          }}
          onCardCreated={(card) => handleCardCreated(selectedListId, card)}
        />
      )}
    </div>
  );
}