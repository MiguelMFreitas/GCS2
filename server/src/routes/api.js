import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../config/upload.js';

import * as authController from '../controllers/authController.js';
import * as vehicleController from '../controllers/vehicleController.js';
import * as sessionController from '../controllers/sessionController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as maintenanceController from '../controllers/maintenanceController.js';
import * as reminderController from '../controllers/reminderController.js';
import * as documentController from '../controllers/documentController.js';
import * as reportController from '../controllers/reportController.js';
import * as userController from '../controllers/userController.js';
import * as uploadController from '../controllers/uploadController.js';

const router = express.Router();

// Public auth routes
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot-password', authController.resetPassword);

// Protected routes
router.use(authenticateToken);

// Current user & password
router.get('/auth/me', authController.getMe);
router.post('/auth/change-password', authController.changePassword);

// Uploads
router.post('/upload', upload.single('file'), uploadController.uploadFile);

// Vehicles
router.get('/vehicles', vehicleController.listVehicles);
router.get('/vehicles/:id', vehicleController.getVehicleById);
router.post('/vehicles', vehicleController.createVehicle);
router.put('/vehicles/:id', vehicleController.updateVehicle);
router.patch('/vehicles/:id/status', vehicleController.updateVehicleStatus);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);
router.get('/vehicles/:id/last-odometer', vehicleController.getLastOdometer);

// Fueling Sessions & Cart Flow
router.get('/sessions', sessionController.listAllSessions);
router.get('/sessions/active', sessionController.getActiveSession);
router.post('/sessions/start', sessionController.createOrStartSession);
router.get('/sessions/:id', sessionController.getSessionById);
router.post('/sessions/:session_id/items', sessionController.addRecordToCart);
router.put('/sessions/:session_id/items/:record_id', sessionController.updateRecordInCart);
router.delete('/sessions/:session_id/items/:record_id', sessionController.removeRecordFromCart);
router.post('/sessions/:id/finalize', sessionController.finalizeSession);
router.post('/sessions/:id/cancel', sessionController.cancelSession);

// Expenses
router.get('/expenses', expenseController.listExpenses);
router.post('/expenses', expenseController.createExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);

// Maintenance
router.get('/maintenance', maintenanceController.listMaintenance);
router.post('/maintenance', maintenanceController.createMaintenance);
router.put('/maintenance/:id', maintenanceController.updateMaintenance);
router.delete('/maintenance/:id', maintenanceController.deleteMaintenance);

// Reminders
router.get('/reminders', reminderController.listReminders);
router.post('/reminders', reminderController.createReminder);
router.patch('/reminders/:id/status', reminderController.updateReminderStatus);
router.delete('/reminders/:id', reminderController.deleteReminder);

// Documents
router.get('/documents', documentController.listDocuments);
router.post('/documents', documentController.createDocument);
router.delete('/documents/:id', documentController.deleteDocument);

// Reports & Dashboard
router.get('/dashboard/summary', reportController.getDashboardStats);
router.get('/reports/fleet', reportController.getFleetReports);
router.get('/reports/session/:session_id/excel', reportController.exportSessionExcel);

// Users
router.get('/users', userController.listUsers);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);

export default router;
