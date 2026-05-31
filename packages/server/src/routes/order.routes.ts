import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff, requireRole } from '../middleware/auth.js';
import { createOrder, listOrders, listCustomerOrders, getOrder, updateOrderStatus } from '../controllers/order.controller.js';
import { validateCart } from '../controllers/cart.controller.js';

const router = Router();

// Cart validation (no auth - guest cart)
router.post('/validate', validateCart);

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, createOrder);

// Customer: view own orders
router.get('/my-orders', authenticate, listCustomerOrders);

// Staff: list and manage orders
router.get('/', authenticate, requireStaff, listOrders);
router.get('/:id', optionalAuth, getOrder);
router.patch('/:id/status', authenticate, requireStaff, updateOrderStatus);

export default router;
