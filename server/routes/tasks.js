const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validateTaskInput } = require('../utils/validation');

// All task routes require authentication
router.use(requireAuth);

/**
 * GET /api/tasks/stats
 * Computes dashboard statistics for the authenticated user
 */
router.get('/stats', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    // Fetch all tasks for current user
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching task stats:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let total = tasks ? tasks.length : 0;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let dueToday = 0;
    const priorityCounts = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
    const categoryCounts = {};

    (tasks || []).forEach(task => {
      // Status counting
      if (task.status === 'Completed') {
        completed++;
      } else if (task.status === 'In Progress') {
        inProgress++;
      } else {
        pending++;
      }

      // Priority counting
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      }

      // Category counting
      const cat = task.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Due date calculations for non-completed tasks
      if (task.due_date && task.status !== 'Completed') {
        const dueDate = new Date(task.due_date);
        if (dueDate < startOfToday) {
          overdue++;
        } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
          dueToday++;
        }
      }
    });

    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate weekly productivity (last 7 days completed vs created)
    const weeklyProductivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayCompleted = (tasks || []).filter(t => {
        if (!t.completed_at) return false;
        const cDate = new Date(t.completed_at);
        return cDate >= dayStart && cDate <= dayEnd;
      }).length;

      const dayCreated = (tasks || []).filter(t => {
        const crDate = new Date(t.created_at);
        return crDate >= dayStart && crDate <= dayEnd;
      }).length;

      weeklyProductivity.push({
        day: dayName,
        date: d.toISOString().split('T')[0],
        completed: dayCompleted,
        created: dayCreated
      });
    }

    return res.json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        dueToday,
        completionPercentage,
        priorityCounts,
        categoryCounts,
        weeklyProductivity
      }
    });
  } catch (err) {
    console.error('Stats computation failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute statistics' });
  }
});

/**
 * GET /api/tasks
 * Fetch tasks with searching, filtering, and sorting
 */
router.get('/', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const {
      search,
      status,
      priority,
      category,
      timeframe,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    // Filter by Status
    if (status && status !== 'All') {
      if (status === 'Overdue') {
        const nowIso = new Date().toISOString();
        query = query.neq('status', 'Completed').lt('due_date', nowIso);
      } else {
        query = query.eq('status', status);
      }
    }

    // Filter by Priority
    if (priority && priority !== 'All') {
      query = query.eq('priority', priority);
    }

    // Filter by Category
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    // Filter by Timeframe (Today, Upcoming, Overdue)
    if (timeframe) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      if (timeframe === 'today') {
        query = query
          .gte('due_date', startOfToday)
          .lte('due_date', endOfToday);
      } else if (timeframe === 'upcoming') {
        query = query.gt('due_date', endOfToday);
      } else if (timeframe === 'overdue') {
        query = query
          .neq('status', 'Completed')
          .lt('due_date', startOfToday);
      }
    }

    // Search filter
    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
    }

    // Sorting
    const validSortFields = ['created_at', 'due_date', 'priority', 'title', 'updated_at', 'status'];
    const selectedSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const isAscending = sortOrder.toLowerCase() === 'asc';

    query = query.order(selectedSortField, { ascending: isAscending, nullsFirst: false });

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error querying tasks:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      tasks: tasks || []
    });
  } catch (err) {
    console.error('Fetch tasks route error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tasks' });
  }
});

/**
 * GET /api/tasks/:id
 * Retrieve a specific task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    return res.json({ success: true, task });
  } catch (err) {
    console.error('Get task error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const { isValid, errors, payload } = validateTaskInput(req.body, false);

    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    const supabase = req.supabase;
    const userId = req.user.id;

    const newTask = {
      ...payload,
      user_id: userId
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) {
      console.error('Error inserting task:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: data
    });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update an existing task
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isValid, errors, payload } = validateTaskInput(req.body, true);

    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    const supabase = req.supabase;
    const userId = req.user.id;

    const { data: existing, error: findError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ success: false, error: 'Task not found or access denied' });
    }

    if (payload.status === 'Completed' && existing.status !== 'Completed') {
      payload.completed_at = new Date().toISOString();
    } else if (payload.status && payload.status !== 'Completed') {
      payload.completed_at = null;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Toggle or mark a task as completed/pending
 */
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.supabase;
    const userId = req.user.id;

    const { data: task, error: findError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    let nextStatus;
    let completedAt = null;

    if (req.body && req.body.status !== undefined) {
      nextStatus = req.body.status;
      completedAt = nextStatus === 'Completed' ? new Date().toISOString() : null;
    } else {
      nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      completedAt = nextStatus === 'Completed' ? new Date().toISOString() : null;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        status: nextStatus,
        completed_at: completedAt
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error toggling task completion:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      message: `Task marked as ${nextStatus}`,
      task: updatedTask
    });
  } catch (err) {
    console.error('Complete task error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task status' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.supabase;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found or access denied' });
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
