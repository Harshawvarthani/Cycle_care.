const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for testing; can restrict to frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.originalUrl}`);
  next();
});


// Database Connection
const startDatabase = async () => {
  let mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI || mongoURI.includes('127.0.0.1') || mongoURI.includes('localhost')) {
    try {
      console.log('Starting Persistent Local MongoDB Server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      const dbDir = path.join(__dirname, 'db-data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const mongoServer = await MongoMemoryServer.create({
        instance: {
          dbPath: dbDir,
          storageEngine: 'wiredTiger'
        }
      });
      mongoURI = mongoServer.getUri();
      console.log('Persistent Local MongoDB Server started successfully.');
    } catch (dbErr) {
      console.warn('Failed to start Persistent Local MongoDB Server. Falling back to local/config URI:', dbErr.message);
      mongoURI = mongoURI || 'mongodb://127.0.0.1:27017/cyclecare';
    }
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Please ensure your database configuration is correct.');
  }
};

startDatabase();


// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cycles', require('./routes/cycles'));
app.use('/api/symptoms', require('./routes/symptoms'));
app.use('/api/hygiene', require('./routes/hygiene'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/reports', require('./routes/reports'));

// Base Route
app.get('/', (req, res) => {
  res.send('CycleCare API running.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
