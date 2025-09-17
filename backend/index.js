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
  'https://b8e45da34abf.ngrok-free.app'
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
mongoose.connect('mongodb://127.0.0.1:27017/passkey-login', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
  const sessionId = uuidv4();
  const userId = req.body.userId || uuidv4();

  sessions[sessionId] = {
    status: 'pending',
    createdAt: Date.now(),
    userId: null
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

  res.status(200).json({ status: session.status });
});

// ---- Confirm Session (POST) ----
app.post('/api/passkey/confirm/:sessionId', async (req, res) => {
  const session = sessions[req.params.sessionId];
  const userId = req.body.userId;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'pending') return res.status(400).json({ error: 'Session already confirmed or expired' });

  session.status = 'authenticated';
  session.userId = userId;

  try {
    const existingUser = await User.findOne({ userId });
    if (!existingUser) await User.create({ userId });
    console.log(`✅ User saved: ${userId}`);
  } catch (err) {
    console.error('❌ MongoDB user save error:', err);
    return res.status(500).json({ error: 'Database error' });
  }

  console.log(`✅ Confirmed POST: ${req.params.sessionId} -> ${userId}`);
  res.json({ success: true });
});

// ---- Confirm Session (GET via QR) ----
app.get('/api/passkey/confirm/:sessionId', async (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).send('Session not found');
  if (session.status !== 'pending') return res.status(400).send('Already confirmed or expired');

  const userId = req.query.userId;
  if (userId) {
    session.status = 'authenticated';
    session.userId = userId;

    try {
      const existingUser = await User.findOne({ userId });
      if (!existingUser) await User.create({ userId });
      console.log(`✅ User saved via QR: ${userId}`);
    } catch (err) {
      console.error('❌ MongoDB save error:', err);
      return res.status(500).send('Database error');
    }

    return res.redirect('https://b8e45da34abf.ngrok-free.app/email');
  }

  res.send(`
    <h2>Confirm Session</h2>
    <form method="POST" action="/api/passkey/confirm/${req.params.sessionId}">
      <label>User ID: <input name="userId" required /></label>
      <button type="submit">Confirm</button>
    </form>
  `);
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
