require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');  // Import the centralized Sequelize instance
const { Subscriber } = require('./models/subscriber');
const { promptGenerationQueue } = require('./queueProcessor');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

const PORT = process.env.PORT || 5001;

// Health check route
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const [results, metadata] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    res.json({ 
      status: 'OK', 
      databaseConnection: 'Successful',
      tables: results.map(r => r.table_name)
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

// Subscriber prompts route
app.get('/api/subscriber/:id/prompts', async (req, res) => {
  try {
    const subscriber = await Subscriber.findByPk(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    res.json({ prompts: subscriber.prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

sequelize.sync({ force: true })
  .then(() => {
    console.log('Database synced');
    console.log('Sequelize models:', Object.keys(sequelize.models));
    console.log('Subscriber model:', sequelize.models.Subscriber);
    console.log('Tables in database:', Object.keys(sequelize.models).map(model => sequelize.models[model].tableName));
    
    return sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  })
  .then(([results, metadata]) => {
    console.log('Tables in database (from query):', results.map(r => r.table_name));
    
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // Initialize scheduler after server starts
    require('./scheduler');
  })
  .catch(error => {
    console.error('Unable to sync database:', error);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Queue error handling
promptGenerationQueue.on('error', (error) => {
  console.error('Bull queue error:', error);
});