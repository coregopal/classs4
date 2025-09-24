const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');

app.use(express.json());

// Ensure a directory exists before writing files
async function ensureDirExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // ignore errors creating existing dir
  }
}

// Save individual attempt
app.post('/api/save-attempt', async (req, res) => {
  try {
    const attemptData = req.body;
    const filePath = path.join(__dirname, 'data', 'attempts.json');
    
    // Read existing attempts
    let attempts = [];
    try {
      const data = await fs.readFile(filePath, 'utf8');
      attempts = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    // Add new attempt
    attempts.push({
      ...attemptData,
      timestamp: new Date().toISOString()
    });
    
    // Ensure directory and save back to file
    await ensureDirExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(attempts, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save attempt' });
  }
});

// Save test result
app.post('/api/save-test-result', async (req, res) => {
  try {
    const incoming = req.body || {};
    const attempted = Number(incoming.attemptedQuestions || 0);
    const correct = Number(incoming.correctAnswers || 0);
    const percentage = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const grade = percentage >= 90 ? 'A+' :
                  percentage >= 80 ? 'A' :
                  percentage >= 70 ? 'B+' :
                  percentage >= 60 ? 'B' :
                  percentage >= 50 ? 'C' : 'D';

    const testData = {
      ...incoming,
      percentage,
      grade,
      timestamp: incoming.timestamp || new Date().toISOString()
    };
    const filePath = path.join(__dirname, 'data', 'test-results.json');
    
    let results = [];
    try {
      const data = await fs.readFile(filePath, 'utf8');
      results = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    results.push(testData);
    
    await ensureDirExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 