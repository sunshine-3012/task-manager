const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/**
 * GET /api/users/profile
 * Retrieves user profile from public.profiles
 */
router.get('/profile', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const newProfile = {
        id: userId,
        full_name: req.user.user_metadata?.full_name || req.user.email.split('@')[0],
        avatar_url: req.user.user_metadata?.avatar_url || '',
        theme_preference: 'dark'
      };

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (!insertError && created) {
        profile = created;
      }
    }

    return res.json({
      success: true,
      profile: {
        id: userId,
        email: req.user.email,
        full_name: profile?.full_name || req.user.user_metadata?.full_name || req.user.email.split('@')[0],
        avatar_url: profile?.avatar_url || '',
        theme_preference: profile?.theme_preference || 'dark'
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
});

/**
 * PUT /api/users/profile
 * Updates user profile & theme preference
 */
router.put('/profile', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { full_name, avatar_url, theme_preference } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url.trim();
    if (theme_preference && ['light', 'dark'].includes(theme_preference)) {
      updates.theme_preference = theme_preference;
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/**
 * GET /api/users/categories
 * Returns categories available to user
 */
router.get('/categories', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Fetch categories error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      categories: categories || []
    });
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load categories' });
  }
});

/**
 * POST /api/users/categories
 * Creates a new category
 */
router.post('/categories', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { name, color = '#6366f1' } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const trimmedName = name.trim().slice(0, 50);

    const { data: newCat, error } = await supabase
      .from('categories')
      .insert([{
        user_id: userId,
        name: trimmedName,
        color: color || '#6366f1'
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      category: newCat
    });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

/**
 * DELETE /api/users/categories/:id
 * Deletes a category
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Category removed' });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

module.exports = router;
