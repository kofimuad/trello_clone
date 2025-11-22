// lib/activityLogger.ts
import { createClient } from '@/lib/supabase/server';

export async function logActivity(
  taskId: string,
  action: 'created' | 'updated' | 'moved' | 'deleted',
  changedBy: string,
  details?: string
) {
  try {
    const supabase = await createClient();

    await supabase.from('task_activities').insert({
      task_id: taskId,
      action,
      changed_by: changedBy,
      details: details || null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}