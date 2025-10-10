import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import qr from 'qrcode';
import os from 'os';
import mongoose from 'mongoose';

const app = express();

// ---- CORS Setup ----
const allowedOrigins = [
  'http://localhost:4200',
  'https://7c2bd97f3eb5.ngrok-free.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
      console.error(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, origin);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;
const sessions = {};

// ---- MongoDB Setup ----
mongoose.connect('mongodb://127.0.0.1:27017/passkey-login')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ---- User schema & model ----
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// ---- Cleanup expired sessions ----
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 5 * 60 * 1000;
  for (const id in sessions) {
    const session = sessions[id];
    if (now - session.createdAt > MAX_AGE) {
      delete sessions[id];
      console.log(`Session ${id} expired and removed.`);
    }
  }
}, 60 * 1000);

// ---- Get Local IP (never fallback to localhost) ----
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  throw new Error('Unable to determine local IP address');
}

// ---- Generate QR Session ----
app.post('/api/passkey/session', async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId in request body' });
  }

  const sessionId = uuidv4();

  sessions[sessionId] = {
    status: 'pending',
    createdAt: Date.now(),
    userId: null,
    redirectTo: null
  };

  try {
    const ip = getLocalIP();
    const rawBaseUrl = req.body.baseUrl || `http://${ip}:${PORT}`;
    const baseUrl = rawBaseUrl.trim();
    const confirmUrl = `${baseUrl}/api/passkey/confirm/${sessionId}?userId=${encodeURIComponent(userId)}`;

    const qrImage = await qr.toDataURL(confirmUrl);
    console.log('✅ Generated confirmUrl:', confirmUrl);

    res.json({ sessionId, qrImage, confirmUrl, userId });
  } catch (err) {
    console.error('❌ Error generating QR code or IP:', err);
    res.status(500).json({ error: 'Could not generate QR' });
  }
});

// ---- Poll Session Status ----
app.get('/api/passkey/status/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  console.log(`Polling status for session: ${sessionId}`);

  const session = sessions[sessionId];
  if (!session) {
    console.warn(`Session not found for ID: ${sessionId}`);
    return res.status(404).json({ status: 'not_found' });
  }

  if (Date.now() - session.createdAt > 5 * 60 * 1000 && session.status === 'pending') {
    session.status = 'expired';
    console.log(`Session ${sessionId} expired.`);
  }

  res.status(200).json({ status: session.status, redirectTo: session.redirectTo || null });
});

// ---- Confirm Session (POST) ----
app.post('/api/passkey/confirm/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions[sessionId];
  const userId = req.body.userId;

  console.log(`POST /api/passkey/confirm/${sessionId} called with userId:`, userId);

  if (!userId) {
    console.warn('POST confirm missing userId');
    return res.status(400).json({ error: 'Missing userId' });
  }
  if (!session) {
    console.warn(`POST confirm session not found: ${sessionId}`);
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.status !== 'pending') {
    console.warn(`POST confirm session already confirmed or expired: ${sessionId}, status: ${session.status}`);
    return res.status(400).json({ error: 'Session already confirmed or expired' });
  }

  session.status = 'authenticated';
  session.userId = userId;

  try {
    const existingUser = await User.findOne({ userId });
    if (!existingUser) {
      await User.create({ userId });
      session.redirectTo = '/email';
      console.log(`✅ User saved: ${userId}`);
      return res.json({ success: true, redirectTo: session.redirectTo });
    } else {
      session.redirectTo = '/dashboard';
      console.log(`✅ Existing user confirmed: ${userId}`);
      return res.json({ success: true, redirectTo: session.redirectTo });
    }
  } catch (err) {
    console.error('❌ MongoDB user save error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ---- Confirm Session (GET via QR) ----
app.get('/api/passkey/confirm/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions[sessionId];
  const userId = req.query.userId;

  console.log(`GET /api/passkey/confirm/${sessionId} called with userId:`, userId);

  if (!session) {
    console.warn(`GET confirm session not found: ${sessionId}`);
    return res.status(404).send('Session not found');
  }
  if (session.status !== 'pending') {
    console.warn(`GET confirm session already confirmed or expired: ${sessionId}, status: ${session.status}`);
    return res.status(400).send('Already confirmed or expired');
  }
  if (!userId) {
    console.warn('GET confirm missing userId');
    return res.status(400).send('Missing userId');
  }

  // ✅ DEBUG: Log before update
  console.log('Session before update:', session);

  session.status = 'authenticated';
  session.userId = userId;

  try {
    const existingUser = await User.findOne({ userId });
    if (!existingUser) {
      session.redirectTo = '/email';
      await User.create({ userId });
      console.log(`✅ New user registered: ${userId}`);
      console.log('Session after update:', session); // ✅ DEBUG
      return res.redirect('https://7c2bd97f3eb5.ngrok-free.app/email');
    } else {
      session.redirectTo = '/dashboard';
      console.log(`✅ Existing user logged in: ${userId}`);
      console.log('Session after update:', session); // ✅ DEBUG
      return res.redirect('https://7c2bd97f3eb5.ngrok-free.app/dashboard');
    }
  } catch (err) {
    console.error('❌ MongoDB save error:', err);
    return res.status(500).send('Database error');
  }
});

// ---- Check if user exists endpoint (NEW) ----
app.get('/api/users/exists/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId });
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Error checking user existence:', err);
    res.status(500).json({ exists: false });
  }
});

// ---- Root ----
app.get('/', (req, res) =>
  res.send('✅ Backend is running. Use /api/passkey/... endpoints.')
);

// ---- 404 Catch-All ----
app.use((req, res) => {
  console.warn(`Unhandled route: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found' });
});

// ---- Start server ----
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running at http://${getLocalIP()}:${PORT}`)
);
