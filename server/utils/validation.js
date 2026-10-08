const VALID_STATUSES = ['Pending', 'In Progress', 'Completed'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

/**
 * Basic HTML escaping to prevent stored XSS attacks
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates task payload for creation or updates
 */
function validateTaskInput(body, isUpdate = false) {
  const errors = [];
  const payload = {};

  // Title validation
  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('Task title is required and cannot be empty.');
    } else if (body.title.trim().length > 255) {
      errors.push('Task title cannot exceed 255 characters.');
    } else {
      payload.title = body.title.trim();
    }
  }

  // Description validation
  if (body.description !== undefined) {
    if (body.description === null || body.description === '') {
      payload.description = null;
    } else if (typeof body.description === 'string') {
      if (body.description.length > 2000) {
        errors.push('Description cannot exceed 2000 characters.');
      } else {
        payload.description = body.description.trim();
      }
    }
  }

  // Status validation
  if (!isUpdate || body.status !== undefined) {
    const status = body.status || 'Pending';
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
    } else {
      payload.status = status;
      if (status === 'Completed') {
        payload.completed_at = body.completed_at || new Date().toISOString();
      } else {
        payload.completed_at = null;
      }
    }
  }

  // Priority validation
  if (!isUpdate || body.priority !== undefined) {
    const priority = body.priority || 'Medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
    } else {
      payload.priority = priority;
    }
  }

  // Category validation
  if (body.category !== undefined) {
    if (!body.category || typeof body.category !== 'string') {
      payload.category = 'General';
    } else {
      payload.category = body.category.trim().slice(0, 50);
    }
  } else if (!isUpdate) {
    payload.category = 'General';
  }

  // Due Date validation
  if (body.due_date !== undefined) {
    if (!body.due_date || body.due_date === '') {
      payload.due_date = null;
    } else {
      const parsedDate = new Date(body.due_date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Due date must be a valid ISO date/time format.');
      } else {
        payload.due_date = parsedDate.toISOString();
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    payload
  };
}

module.exports = {
  VALID_STATUSES,
  VALID_PRIORITIES,
  sanitizeString,
  validateTaskInput
};
