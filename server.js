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

// Save test result with subject and date organization
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
    
    // Create directory structure: results-data/subject/YYYY-MM-DD.json
    const subject = testData.subject || 'unknown';
    const date = new Date(testData.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    const subjectDir = path.join(__dirname, 'results-data', subject);
    const filePath = path.join(subjectDir, `${date}.json`);
    
    // Ensure subject directory exists
    await ensureDirExists(subjectDir);
    
    let dayResults = [];
    try {
      const data = await fs.readFile(filePath, 'utf8');
      dayResults = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }
    
    dayResults.push(testData);
    
    await fs.writeFile(filePath, JSON.stringify(dayResults, null, 2));
    
    res.json({ success: true, subject, date });
  } catch (error) {
    console.error('Error saving test result:', error);
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

// Get all test results from file storage
app.get('/api/test-results', async (req, res) => {
  try {
    const resultsDir = path.join(__dirname, 'results-data');
    const allResults = [];
    
    try {
      const subjects = await fs.readdir(resultsDir);
      
      for (const subject of subjects) {
        const subjectDir = path.join(resultsDir, subject);
        const stat = await fs.stat(subjectDir);
        
        if (stat.isDirectory()) {
          const dateFiles = await fs.readdir(subjectDir);
          
          for (const dateFile of dateFiles) {
            if (dateFile.endsWith('.json')) {
              const filePath = path.join(subjectDir, dateFile);
              const data = await fs.readFile(filePath, 'utf8');
              const dayResults = JSON.parse(data);
              
              // Add source info and merge
              dayResults.forEach(result => {
                allResults.push({
                  ...result,
                  source: 'file',
                  storedDate: dateFile.replace('.json', '')
                });
              });
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
    }
    
    // Sort by timestamp descending
    allResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ results: allResults });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Clear results for specific subject or all subjects
app.delete('/api/test-results', async (req, res) => {
  try {
    const { subject } = req.query;
    const resultsDir = path.join(__dirname, 'results-data');
    
    if (subject === 'all' || !subject) {
      // Clear all results
      try {
        await fs.rmdir(resultsDir, { recursive: true });
      } catch (error) {
        // Directory might not exist
      }
      await ensureDirExists(resultsDir);
    } else {
      // Clear specific subject
      const subjectDir = path.join(resultsDir, subject);
      try {
        await fs.rmdir(subjectDir, { recursive: true });
      } catch (error) {
        // Directory might not exist
      }
    }
    
    res.json({ success: true, message: `Results cleared for ${subject === 'all' ? 'all subjects' : subject}` });
  } catch (error) {
    console.error('Error clearing test results:', error);
    res.status(500).json({ error: 'Failed to clear test results' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});