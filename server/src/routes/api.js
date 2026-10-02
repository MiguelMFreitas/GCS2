import express from 'express';
import {
  authenticateToken,
  requireGerente,
  requireEncarregadoOrGerente
} from '../middlewares/auth.js';
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

// Protected routes (require authentication)
router.use(authenticateToken);

// Current user & password
router.get('/auth/me', authController.getMe);
router.post('/auth/change-password', authController.changePassword);

// Uploads (Dashboard & Pump photos)
router.post('/upload', upload.single('file'), uploadController.uploadFile);

// ==========================================
// EMPLOYEE OPERATIONAL ROUTES (All Roles)
// ==========================================
// Pending vehicles for current week (sanitized for employee)
router.get('/fueling/pending-vehicles', sessionController.getPendingVehiclesForEmployee);
// Employee direct fueling submission
router.post('/fueling/submit', sessionController.submitEmployeeFueling);
// Last odometer lookup
router.get('/vehicles/:id/last-odometer', vehicleController.getLastOdometer);

// ==========================================
// OPERATIONAL & REPORTING ROUTES (Gerente & Encarregado)
// ==========================================
// Vehicles consultation
router.get('/vehicles', requireEncarregadoOrGerente, vehicleController.listVehicles);
router.get('/vehicles/:id', requireEncarregadoOrGerente, vehicleController.getVehicleById);

// Fueling Sessions & Cart Flow
router.get('/sessions', requireEncarregadoOrGerente, sessionController.listAllSessions);
router.get('/sessions/active', requireEncarregadoOrGerente, sessionController.getActiveSession);
router.post('/sessions/start', requireEncarregadoOrGerente, sessionController.createOrStartSession);
router.get('/sessions/:id', requireEncarregadoOrGerente, sessionController.getSessionById);
router.post('/sessions/:session_id/items', requireEncarregadoOrGerente, sessionController.addRecordToCart);
router.put('/sessions/:session_id/items/:record_id', requireEncarregadoOrGerente, sessionController.updateRecordInCart);
router.delete('/sessions/:session_id/items/:record_id', requireEncarregadoOrGerente, sessionController.removeRecordFromCart);
router.post('/sessions/:id/finalize', requireEncarregadoOrGerente, sessionController.finalizeSession);
// Standalone Fueling Record Management (Edit & Delete)
router.put('/fuelings/:id', requireEncarregadoOrGerente, sessionController.updateFuelRecordDirect);
router.delete('/fuelings/:id', requireEncarregadoOrGerente, sessionController.deleteFuelRecordDirect);
router.put('/fuel-records/:id', requireEncarregadoOrGerente, sessionController.updateFuelRecordDirect);
router.delete('/fuel-records/:id', requireEncarregadoOrGerente, sessionController.deleteFuelRecordDirect);

// Expenses
router.get('/expenses', requireEncarregadoOrGerente, expenseController.listExpenses);
router.post('/expenses', requireEncarregadoOrGerente, expenseController.createExpense);
router.delete('/expenses/:id', requireEncarregadoOrGerente, expenseController.deleteExpense);

// Maintenance
router.get('/maintenance', requireEncarregadoOrGerente, maintenanceController.listMaintenance);
router.post('/maintenance', requireEncarregadoOrGerente, maintenanceController.createMaintenance);
router.put('/maintenance/:id', requireEncarregadoOrGerente, maintenanceController.updateMaintenance);
router.delete('/maintenance/:id', requireEncarregadoOrGerente, maintenanceController.deleteMaintenance);

// Reminders
router.get('/reminders', requireEncarregadoOrGerente, reminderController.listReminders);
router.post('/reminders', requireEncarregadoOrGerente, reminderController.createReminder);
router.patch('/reminders/:id/status', requireEncarregadoOrGerente, reminderController.updateReminderStatus);
router.delete('/reminders/:id', requireEncarregadoOrGerente, reminderController.deleteReminder);

// Documents
router.get('/documents', requireEncarregadoOrGerente, documentController.listDocuments);
router.post('/documents', requireEncarregadoOrGerente, documentController.createDocument);
router.delete('/documents/:id', requireEncarregadoOrGerente, documentController.deleteDocument);

// Reports & Dashboard
router.get('/dashboard/summary', requireEncarregadoOrGerente, reportController.getDashboardStats);
router.get('/reports/fleet', requireEncarregadoOrGerente, reportController.getFleetReports);
router.get('/reports/session/:session_id/excel', requireEncarregadoOrGerente, reportController.exportSessionExcel);

// ==========================================
// ADMINISTRATIVE ROUTES (Exclusively GERENTE)
// ==========================================
// Vehicle Management (Create, Edit, Status, Delete)
router.post('/vehicles', requireGerente, vehicleController.createVehicle);
router.put('/vehicles/:id', requireGerente, vehicleController.updateVehicle);
router.patch('/vehicles/:id/status', requireGerente, vehicleController.updateVehicleStatus);
router.delete('/vehicles/:id', requireGerente, vehicleController.deleteVehicle);

// User Management (List, Create, Edit, Status, Reset Password, Delete)
router.get('/users', requireGerente, userController.listUsers);
router.post('/users', requireGerente, userController.createUser);
router.put('/users/:id', requireGerente, userController.updateUser);
router.patch('/users/:id/status', requireGerente, userController.updateUserStatus);
router.post('/users/:id/reset-password', requireGerente, userController.resetUserPassword);
router.delete('/users/:id', requireGerente, userController.deleteUser);

export default router;


