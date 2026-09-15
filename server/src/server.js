import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDb, get } from './config/database.js';
import apiRoutes from './routes/api.js';
import { seedDatabase } from './seed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files for uploaded photos and documents
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
  try {
    await getDb();
    console.log('✅ Banco de dados SQLite inicializado.');

    // Auto-seed if empty
    const userCount = get('SELECT COUNT(id) as count FROM users');
    if (!userCount || userCount.count === 0) {
      console.log('🌱 Banco vazio detectado. Executando seed inicial...');
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor GCS2 rodando na porta ${PORT} (http://localhost:${PORT})`);
    });
  } catch (err) {
    console.error('❌ Erro fatal ao iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();
