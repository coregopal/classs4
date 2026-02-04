# Quiz Results Storage

This directory contains permanently stored quiz results organized by subject and date.

## Directory Structure

```
results-data/
├── english_language/
│   ├── 2025-02-04.json
│   └── 2025-02-05.json
├── math/
│   ├── 2025-02-04.json
│   └── 2025-02-05.json
├── science/
│   └── 2025-02-04.json
└── hindi/
    └── 2025-02-04.json
```

## File Format

Each JSON file contains an array of quiz results for that specific subject and date:

```json
[
  {
    "subject": "english_language",
    "category": "all",
    "totalQuestions": 50,
    "attemptedQuestions": 45,
    "correctAnswers": 38,
    "percentage": 84,
    "grade": "A",
    "wrongAnswers": [...],
    "timestamp": "2025-02-04T10:30:00.000Z",
    "source": "file",
    "storedDate": "2025-02-04"
  }
]
```

## Features

- **Permanent Storage**: Results are stored in files, not localStorage
- **Subject Organization**: Each subject has its own directory
- **Date-wise Files**: Results are organized by date (YYYY-MM-DD.json)
- **Server API**: Results are accessed via REST API endpoints
- **Clear Function**: Can clear results for specific subjects or all subjects

## API Endpoints

- `GET /api/test-results` - Get all results
- `POST /api/save-test-result` - Save a new result
- `DELETE /api/test-results?subject={subject}` - Clear results for subject

## Usage

1. Start the server: `npm run server`
2. Start the app: `npm start`
3. Or run both together: `npm run dev`

Results will be automatically saved here when students complete quizzes.
