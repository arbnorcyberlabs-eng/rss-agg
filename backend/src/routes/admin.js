const express = require('express');
const { z } = require('zod');
const { requireRole } = require('../middleware/auth');
const {
  listUsers,
  adminCreateUser,
  adminUpdateUser,
  deleteUserById
} = require('../services/userService');
const { deleteSessionsForUser } = require('../services/authService');
const { listAllFeeds } = require('../services/feedService');

const router = express.Router();

const rolesSchema = z.array(z.string().min(1)).optional();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
  roles: rolesSchema,
  emailVerified: z.boolean().optional()
});

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    displayName: z.string().optional(),
    roles: rolesSchema,
    emailVerified: z.boolean().optional()
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No updates provided' });

router.use(requireRole('admin'));

router.get('/users', async (req, res) => {
  const users = await listUsers();
  res.json({ users });
});

router.get('/feeds', async (req, res) => {
  const feeds = await listAllFeeds();
  res.json({ feeds });
});

router.post('/users', async (req, res) => {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await adminCreateUser(body);
    res.status(201).json({ user });
  } catch (err) {
    const status = err.message === 'Email already registered' ? 400 : 500;
    res.status(status).json({ error: err.message || 'User creation failed' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const updates = updateUserSchema.parse(req.body);
    const user = await adminUpdateUser(req.params.id, updates);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    const status = err.message === 'Email already registered' ? 400 : 500;
    res.status(status).json({ error: err.message || 'User update failed' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await deleteSessionsForUser(req.params.id);
    const result = await deleteUserById(req.params.id);
    if (!result?.deletedCount) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'User deletion failed' });
  }
});

module.exports = router;


