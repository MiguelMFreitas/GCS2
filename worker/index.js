// Cloudflare Worker Main Entrypoint - GCS2 Fleet & Fuel Control
import * as authRoute from './routes/auth.js';
import * as vehicleRoute from './routes/vehicles.js';
import * as sessionRoute from './routes/sessions.js';
import * as expenseRoute from './routes/expenses.js';
import * as maintenanceRoute from './routes/maintenance.js';
import * as reminderRoute from './routes/reminders.js';
import * as documentRoute from './routes/documents.js';
import * as reportRoute from './routes/reports.js';
import * as userRoute from './routes/users.js';
import * as uploadRoute from './routes/upload.js';
import { verifyToken, parseCookies } from './utils/auth.js';

function addCorsHeaders(response, request) {
  const newHeaders = new Headers(response.headers);
  const origin = request.headers.get('Origin') || '*';
  
  newHeaders.set('Access-Control-Allow-Origin', origin);
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
  newHeaders.set('Access-Control-Max-Age', '86400');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // 1. Handle CORS Preflight
    if (method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || '*';
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    try {
      // 2. Serve static uploads directly from Cloudflare R2
      if (pathname.startsWith('/uploads/')) {
        const filename = pathname.replace('/uploads/', '');
        const fileResponse = await uploadRoute.serveFile(request, env, filename);
        return addCorsHeaders(fileResponse, request);
      }

      // 3. API Routes Handling
      if (pathname.startsWith('/api/')) {
        const apiResponse = await handleApiRoute(request, env, pathname, method);
        return addCorsHeaders(apiResponse, request);
      }

      // 4. Static Assets Handling for SPA Frontend
      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response('GCS2 Fleet System API - Cloudflare Worker Online', { status: 200 });
    } catch (err) {
      console.error('Unhandled Worker Error:', err);
      const errorResponse = Response.json({ error: 'Erro interno no servidor Cloudflare Worker.', details: err.message }, { status: 500 });
      return addCorsHeaders(errorResponse, request);
    }
  }
};

async function handleApiRoute(request, env, pathname, method) {
  // Public Routes (No auth required)
  if (method === 'POST' && pathname === '/api/auth/login') {
    return await authRoute.login(request, env);
  }
  if (method === 'POST' && pathname === '/api/auth/logout') {
    return await authRoute.logout(request, env);
  }
  if (method === 'POST' && pathname === '/api/auth/forgot-password') {
    return await authRoute.resetPassword(request, env);
  }

  // Extract token from Cookie or Authorization header
  const cookies = parseCookies(request);
  let token = cookies['gcs2_session'] || null;

  if (!token) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  const user = token ? await verifyToken(token, env.JWT_SECRET) : null;

  if (!user) {
    return Response.json({ error: 'Acesso negado. Sessão inválida ou ausente.' }, { status: 401 });
  }

  // --- Authenticated User Profile & Password ---
  if (method === 'GET' && pathname === '/api/auth/me') {
    return await authRoute.getMe(request, env, user);
  }
  if (method === 'POST' && (pathname === '/api/auth/change-password' || pathname === '/api/auth/password')) {
    return await authRoute.changePassword(request, env, user);
  }

  // --- Uploads (Cloudflare R2) ---
  if (method === 'POST' && pathname === '/api/upload') {
    return await uploadRoute.uploadFile(request, env);
  }

  // --- Vehicles Routes ---
  if (method === 'GET' && pathname === '/api/vehicles') {
    return await vehicleRoute.listVehicles(request, env);
  }
  if (method === 'POST' && pathname === '/api/vehicles') {
    return await vehicleRoute.createVehicle(request, env, user);
  }
  
  let match = pathname.match(/^\/api\/vehicles\/(\d+)\/last-odometer$/);
  if (match && method === 'GET') {
    return await vehicleRoute.getLastOdometer(request, env, user, match[1]);
  }

  match = pathname.match(/^\/api\/vehicles\/(\d+)\/status$/);
  if (match && method === 'PATCH') {
    return await vehicleRoute.updateVehicleStatus(request, env, user, match[1]);
  }

  match = pathname.match(/^\/api\/vehicles\/(\d+)$/);
  if (match) {
    const id = match[1];
    if (method === 'GET') return await vehicleRoute.getVehicleById(request, env, user, id);
    if (method === 'PUT') return await vehicleRoute.updateVehicle(request, env, user, id);
    if (method === 'DELETE') return await vehicleRoute.deleteVehicle(request, env, user, id);
  }

  // --- Fueling Sessions & Cart Routes ---
  if (method === 'GET' && pathname === '/api/sessions') {
    return await sessionRoute.listAllSessions(request, env);
  }
  if (method === 'GET' && pathname === '/api/sessions/active') {
    return await sessionRoute.getActiveSession(request, env);
  }
  if (method === 'POST' && pathname === '/api/sessions/start') {
    return await sessionRoute.createOrStartSession(request, env, user);
  }

  match = pathname.match(/^\/api\/sessions\/(\d+)\/items\/(\d+)$/);
  if (match) {
    const [_, sessionId, recordId] = match;
    if (method === 'PUT') return await sessionRoute.updateRecordInCart(request, env, user, sessionId, recordId);
    if (method === 'DELETE') return await sessionRoute.removeRecordFromCart(request, env, user, sessionId, recordId);
  }

  match = pathname.match(/^\/api\/sessions\/(\d+)\/items$/);
  if (match && method === 'POST') {
    return await sessionRoute.addRecordToCart(request, env, user, match[1]);
  }

  match = pathname.match(/^\/api\/sessions\/(\d+)\/finalize$/);
  if (match && method === 'POST') {
    return await sessionRoute.finalizeSession(request, env, user, match[1]);
  }

  match = pathname.match(/^\/api\/sessions\/(\d+)\/cancel$/);
  if (match && method === 'POST') {
    return await sessionRoute.cancelSession(request, env, user, match[1]);
  }

  match = pathname.match(/^\/api\/sessions\/(\d+)$/);
  if (match && method === 'GET') {
    return await sessionRoute.getSessionById(request, env, user, match[1]);
  }

  // --- Expenses Routes ---
  if (method === 'GET' && pathname === '/api/expenses') {
    return await expenseRoute.listExpenses(request, env);
  }
  if (method === 'POST' && pathname === '/api/expenses') {
    return await expenseRoute.createExpense(request, env, user);
  }
  match = pathname.match(/^\/api\/expenses\/(\d+)$/);
  if (match && method === 'DELETE') {
    return await expenseRoute.deleteExpense(request, env, user, match[1]);
  }

  // --- Maintenance Routes ---
  if (method === 'GET' && pathname === '/api/maintenance') {
    return await maintenanceRoute.listMaintenance(request, env);
  }
  if (method === 'POST' && pathname === '/api/maintenance') {
    return await maintenanceRoute.createMaintenance(request, env, user);
  }
  match = pathname.match(/^\/api\/maintenance\/(\d+)$/);
  if (match && method === 'PUT') {
    return await maintenanceRoute.updateMaintenance(request, env, user, match[1]);
  }

  // --- Reminders Routes ---
  if (method === 'GET' && pathname === '/api/reminders') {
    return await reminderRoute.listReminders(request, env);
  }
  if (method === 'POST' && pathname === '/api/reminders') {
    return await reminderRoute.createReminder(request, env, user);
  }
  match = pathname.match(/^\/api\/reminders\/(\d+)\/status$/);
  if (match && method === 'PATCH') {
    return await reminderRoute.updateReminderStatus(request, env, user, match[1]);
  }

  // --- Documents Routes ---
  if (method === 'GET' && pathname === '/api/documents') {
    return await documentRoute.listDocuments(request, env);
  }
  if (method === 'POST' && pathname === '/api/documents') {
    return await documentRoute.createDocument(request, env, user);
  }
  match = pathname.match(/^\/api\/documents\/(\d+)$/);
  if (match && method === 'DELETE') {
    return await documentRoute.deleteDocument(request, env, user, match[1]);
  }

  // --- Reports & Dashboard Routes ---
  if (method === 'GET' && pathname === '/api/dashboard/summary') {
    return await reportRoute.getDashboardStats(request, env);
  }
  if (method === 'GET' && pathname === '/api/reports/fleet') {
    return await reportRoute.getFleetReports(request, env);
  }
  match = pathname.match(/^\/api\/reports\/session\/(\d+)\/excel$/);
  if (match && method === 'GET') {
    return await reportRoute.exportSessionExcel(request, env, user, match[1]);
  }

  // --- Users Management Routes ---
  if (method === 'GET' && pathname === '/api/users') {
    return await userRoute.listUsers(request, env);
  }
  if (method === 'POST' && pathname === '/api/users') {
    return await userRoute.createUser(request, env, user);
  }
  match = pathname.match(/^\/api\/users\/(\d+)$/);
  if (match && method === 'PUT') {
    return await userRoute.updateUser(request, env, user, match[1]);
  }

  return Response.json({ error: `Rota não encontrada: ${method} ${pathname}` }, { status: 404 });
}
