# 🎯 Class 4 Quiz App - Serverless Edition

## 🚀 Serverless File Storage

This quiz application now uses **completely serverless** storage with permanent browser-based file management.

### ✨ Key Features

- **🗄️ IndexedDB Storage** - Permanent browser storage that survives restarts
- **📁 File Export/Import** - Backup and restore results as JSON files
- **🔍 Subject Organization** - Automatic categorization by subject and date
- **⚡ Offline-First** - Works completely without internet connection
- **📱 Cross-Platform** - Works on all modern browsers

### 🎮 How to Use

1. **Start the App**: Double-click `run.bat` or run `npm start`
2. **Take Quizzes**: Complete any subject quiz
3. **View Results**: Results are automatically saved permanently
4. **Export Data**: Use "📥 Export All" button to download backup
5. **Import Data**: Use "📤 Import" button to restore from backup

### 💾 Storage Details

#### **Browser Storage (IndexedDB)**
- **Capacity**: Up to several gigabytes
- **Persistence**: Permanent until manually cleared
- **Performance**: Instant access, no network latency
- **Privacy**: Data never leaves your browser

#### **File Export Format**
```json
[
  {
    "subject": "math",
    "category": "all",
    "totalQuestions": 50,
    "attemptedQuestions": 45,
    "correctAnswers": 38,
    "percentage": 84,
    "grade": "A",
    "wrongAnswers": [...],
    "timestamp": "2025-02-04T10:30:00.000Z",
    "date": "2025-02-04"
  }
]
```

### 🔧 Technical Stack

- **Frontend**: React 18 + React Router
- **Storage**: IndexedDB (FileStorageService.js)
- **File API**: File System Access API (Chrome/Edge)
- **Backup**: JSON Export/Import
- **Styling**: CSS3 with animations

### 📂 Project Structure

```
classs4/
├── src/
│   ├── components/
│   │   ├── Quiz.js          # Main quiz component
│   │   ├── Results.js       # Results management
│   │   └── Home.js          # Subject selection
│   ├── services/
│   │   └── FileStorageService.js  # Serverless storage engine
│   ├── styles/              # CSS styling
│   └── data/                # Quiz questions (JSON)
├── run.bat                  # Startup script
└── package.json             # Dependencies
```

### 🎯 Benefits

- **🚫 No Server Required** - Zero infrastructure needed
- **💰 Cost-Free** - No hosting or server costs
- **🔒 Privacy-First** - Data stays on your device
- **⚡ Blazing Fast** - No network delays
- **📱 Portable** - Works on any device with a browser
- **🔄 Backup Ready** - Export/import for data safety

### 🚀 Getting Started

1. **Install Node.js** from https://nodejs.org
2. **Run the app**: Double-click `run.bat`
3. **Start taking quizzes** - results save automatically!

### 📊 Data Management

- **View Results**: Click "📊 View Results" on home page
- **Export Data**: "📥 Export All" button in results page
- **Import Data**: "📤 Import" button in results page
- **Clear Data**: "🗑️ Clear Results" dropdown for selective cleanup

### 🌐 Browser Compatibility

- ✅ Chrome/Edge (full features with File System Access API)
- ✅ Firefox/Safari (IndexedDB + download/upload)
- ✅ Mobile browsers (touch-optimized interface)

---

**🎉 Enjoy your serverless quiz experience with permanent file storage!**
