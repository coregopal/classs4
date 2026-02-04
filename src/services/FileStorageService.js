// Serverless File Storage Service
// Uses IndexedDB for permanent browser storage + File System Access API for direct file operations

class FileStorageService {
  constructor() {
    this.dbName = 'QuizResultsDB';
    this.dbVersion = 1;
    this.storeName = 'results';
    this.db = null;
  }

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('subject', 'subject', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Save result to IndexedDB
  async saveResult(resultData) {
    await this.initDB();
    
    const result = {
      ...resultData,
      id: Date.now() + Math.random(),
      date: new Date(resultData.timestamp).toISOString().split('T')[0],
      savedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(result);
      
      request.onsuccess = () => resolve(result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all results from IndexedDB
  async getAllResults() {
    await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get results by subject
  async getResultsBySubject(subject) {
    await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('subject');
      const request = index.getAll(subject);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete results by subject
  async deleteResultsBySubject(subject) {
    await this.initDB();
    
    const results = await this.getResultsBySubject(subject);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      let deletedCount = 0;
      const totalToDelete = results.length;
      
      if (totalToDelete === 0) {
        resolve(0);
        return;
      }
      
      results.forEach(result => {
        const request = store.delete(result.id);
        request.onsuccess = () => {
          deletedCount++;
          if (deletedCount === totalToDelete) {
            resolve(deletedCount);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Delete all results
  async deleteAllResults() {
    await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Export results to JSON file (download)
  async exportResults(subject = null) {
    const results = subject ? await this.getResultsBySubject(subject) : await this.getAllResults();
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const filename = subject 
      ? `quiz-results-${subject}-${new Date().toISOString().split('T')[0]}.json`
      : `quiz-results-all-${new Date().toISOString().split('T')[0]}.json`;
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return results.length;
  }

  // Import results from JSON file
  async importResults(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const importedResults = JSON.parse(e.target.result);
          let importedCount = 0;
          
          for (const result of importedResults) {
            try {
              await this.saveResult(result);
              importedCount++;
            } catch (error) {
              console.warn('Failed to import result:', result, error);
            }
          }
          
          resolve(importedCount);
        } catch (error) {
          reject(new Error('Invalid JSON file format'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Check if File System Access API is supported
  isFileSystemAccessSupported() {
    return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
  }

  // Save to local file using File System Access API (Chrome/Edge)
  async saveToFileSystem(results, filename = 'quiz-results.json') {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(results, null, 2));
      await writable.close();
      
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        return false; // User cancelled
      }
      throw error;
    }
  }

  // Load from local file using File System Access API
  async loadFromFileSystem() {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const file = await fileHandle.getFile();
      const contents = await file.text();
      return JSON.parse(contents);
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  // Get storage statistics
  async getStorageStats() {
    await this.initDB();
    
    const allResults = await this.getAllResults();
    const subjects = [...new Set(allResults.map(r => r.subject))];
    
    const stats = {
      totalResults: allResults.length,
      subjects: subjects.map(subject => ({
        name: subject,
        count: allResults.filter(r => r.subject === subject).length
      })),
      dateRange: {
        earliest: allResults.length > 0 ? Math.min(...allResults.map(r => new Date(r.timestamp))) : null,
        latest: allResults.length > 0 ? Math.max(...allResults.map(r => new Date(r.timestamp))) : null
      },
      storageSize: new Blob([JSON.stringify(allResults)]).size
    };
    
    return stats;
  }
}

// Export singleton instance
export const fileStorage = new FileStorageService();
