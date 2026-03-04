import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fileStorage } from '../services/FileStorageService';
import '../styles/Results.css';

function Results() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview | all | subjects | wrong-answers
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [resumableTests, setResumableTests] = useState(new Set());
  const navigate = useNavigate();

  // Check for review=wrong-answers parameter
  useEffect(() => {
    const reviewParam = searchParams.get('review');
    if (reviewParam === 'wrong-answers') {
      // Load current quiz result from sessionStorage
      try {
        const currentResult = sessionStorage.getItem('currentQuizResult');
        if (currentResult) {
          const resultData = JSON.parse(currentResult);
          setSelectedResult(resultData);
          // Clear sessionStorage after loading
          sessionStorage.removeItem('currentQuizResult');
        }
      } catch (error) {
        console.error('Error loading current quiz result:', error);
      }
    }
  }, [searchParams]);

  // Check if the currently selected result can be resumed
  const currentResultCanResume = useMemo(() => {
    if (!selectedResult) return false;
    const identifier = `${selectedResult.subject}-${selectedResult.category || 'all'}-${selectedResult.timestamp}`;
    return resumableTests.has(identifier);
  }, [selectedResult, resumableTests]);

  // Function to check if a test can be resumed
  const canResumeTest = useCallback(async (result) => {
    if (!result) return false;
    
    // Check if the test was completed
    const wasCompleted = result.attemptedQuestions >= result.totalQuestions;
    if (wasCompleted) return false;
    
    // Check if there's saved progress for this subject
    try {
      const savedProgress = await fileStorage.loadProgress(result.subject, result.category || 'all');
      if (!savedProgress) return false;
      
      // Verify that the saved progress matches an incomplete test
      if (savedProgress.answeredQuestions && savedProgress.answeredQuestions.length >= result.totalQuestions) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking resume eligibility:', error);
      return false;
    }
  }, []);

  // Check which tests can be resumed
  const checkResumableTests = useCallback(async (resultsList) => {
    const resumable = new Set();
    
    for (const result of resultsList) {
      const canResume = await canResumeTest(result);
      if (canResume) {
        // Use a unique identifier for the result
        const identifier = `${result.subject}-${result.category || 'all'}-${result.timestamp}`;
        resumable.add(identifier);
      }
    }
    
    setResumableTests(resumable);
  }, [canResumeTest]);

  // Debug: Log when selectedResult changes
  useEffect(() => {
    if (selectedResult) {
      console.log('Selected result for wrong answers review:', selectedResult);
      console.log('Wrong answers data:', selectedResult.wrongAnswers);
    }
  }, [selectedResult]);

  // Function to clear corrupted data
  const clearCorruptedData = useCallback(async () => {
    try {
      // Clear all results with suspicious wrongAnswers counts
      const allResults = await fileStorage.getAllResults();
      const corruptedResults = allResults.filter(result => {
        const wrongCount = result.wrongAnswers ? result.wrongAnswers.length : 0;
        const attempted = result.attemptedQuestions || result.total || 0;
        const correct = result.correctAnswers || result.score || 0;
        const expectedWrong = attempted - correct;
        
        // Use same lenient validation as above
        const hasLargeDiscrepancy = Math.abs(wrongCount - expectedWrong) > 5;
        const hasImpossibleCount = wrongCount > attempted || wrongCount > 300; // Increased to 300 for large papers
        const hasNegativeValues = attempted < 0 || correct < 0 || wrongCount < 0;
        
        return hasLargeDiscrepancy || hasImpossibleCount || hasNegativeValues;
      });
      
      if (corruptedResults.length > 0) {
        console.log('Found corrupted results:', corruptedResults.length);
        
        // Clear all browser storage comprehensively
        // 1. Clear IndexedDB completely
        await fileStorage.deleteAllResults();
        
        // 2. Clear all localStorage
        const localStorageKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress'))) {
            localStorageKeys.push(key);
          }
        }
        localStorageKeys.forEach(key => localStorage.removeItem(key));
        
        // 3. Clear all sessionStorage
        const sessionStorageKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress'))) {
            sessionStorageKeys.push(key);
          }
        }
        sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
        
        console.log(`Cleared ${localStorageKeys.length} localStorage keys and ${sessionStorageKeys.length} sessionStorage keys due to corruption`);
        
        // Reload clean data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error clearing corrupted data:', error);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const results = await fileStorage.getAllResults();
        
        // Check for corrupted data with more lenient validation
        const hasCorruptedData = results.some(result => {
          const wrongCount = result.wrongAnswers ? result.wrongAnswers.length : 0;
          const attempted = result.attemptedQuestions || result.total || 0;
          const correct = result.correctAnswers || result.score || 0;
          const expectedWrong = attempted - correct;
          
          // More lenient corruption detection
          // Only flag as corrupted if the discrepancy is very large or clearly impossible
          const hasLargeDiscrepancy = Math.abs(wrongCount - expectedWrong) > 5;
          const hasImpossibleCount = wrongCount > attempted || wrongCount > 300; // Increased to 300 for large papers
          const hasNegativeValues = attempted < 0 || correct < 0 || wrongCount < 0;
          
          const isCorrupted = hasLargeDiscrepancy || hasImpossibleCount || hasNegativeValues;
          
          if (isCorrupted) {
            console.warn('Potentially corrupted result detected:', {
              result: result.subject + ' - ' + result.category,
              wrongCount,
              expectedWrong,
              attempted,
              correct,
              hasLargeDiscrepancy,
              hasImpossibleCount,
              hasNegativeValues
            });
          }
          
          return isCorrupted;
        });
        
        if (hasCorruptedData) {
          setError('⚠️ Corrupted data detected. Click here to clean up.');
          setLoading(false);
          return;
        }
        
        // Sort by timestamp desc if available
        results.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        setResults(results);
        checkResumableTests(results);
      } catch (e) {
        setError('Failed to load results. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [checkResumableTests]);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const total = results.length;
    let totalAttempted = 0;
    let totalCorrect = 0;
    const bySubject = {};
    results.forEach(r => {
      const subject = r.subject || 'Unknown';
      const attempted = r.attemptedQuestions ?? r.total ?? 0;
      const correct = r.correctAnswers ?? r.score ?? 0;
      totalAttempted += attempted;
      totalCorrect += correct;
      if (!bySubject[subject]) bySubject[subject] = { tests: 0, attempted: 0, correct: 0 };
      bySubject[subject].tests += 1;
      bySubject[subject].attempted += attempted;
      bySubject[subject].correct += correct;
    });
    const avgAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const subjectStats = Object.entries(bySubject).map(([subject, s]) => ({
      subject,
      tests: s.tests,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0
    })).sort((a, b) => b.accuracy - a.accuracy);
    const best = subjectStats[0];
    return { total, avgAccuracy, subjectStats, best };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (subjectFilter === 'all') return results;
    return results.filter(r => (r.subject || 'Unknown') === subjectFilter);
  }, [results, subjectFilter]);

  const subjects = useMemo(() => {
    const set = new Set(results.map(r => r.subject || 'Unknown'));
    return ['all', ...Array.from(set)];
  }, [results]);

  // Function to export results
  const exportResults = async (subject = null) => {
    try {
      const count = await fileStorage.exportResults(subject);
      alert(`Successfully exported ${count} result(s) to file.`);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Error exporting results. Please try again.');
    }
  };

  // Function to import results
  const importResults = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const count = await fileStorage.importResults(file);
            // Reload results after import
            const updatedResults = await fileStorage.getAllResults();
            setResults(updatedResults);
            alert(`Successfully imported ${count} result(s).`);
          } catch (error) {
            alert('Error importing file. Please ensure it\'s a valid JSON file.');
          }
        }
      };
      input.click();
    } catch (error) {
      console.error('Error importing results:', error);
      alert('Error importing results. Please try again.');
    }
  };

  // Function to resume the currently viewed test
  const resumeLastTest = async () => {
    try {
      // Get the currently selected result, or fall back to most recent
      const targetResult = selectedResult || (results.length > 0 ? results[0] : null);
      
      if (!targetResult) {
        alert('No test found to resume.');
        return;
      }

      const subject = targetResult.subject;
      const category = targetResult.category || 'all';
      const attemptedQuestions = targetResult.attemptedQuestions || 0;

      // Check if there's saved progress for this subject
      const savedProgress = await fileStorage.loadProgress(subject, category);
      
      if (!savedProgress) {
        alert('No saved progress found for this test. You may need to start a new test.');
        return;
      }

      // Verify that the saved progress matches an incomplete test
      if (savedProgress.answeredQuestions && savedProgress.answeredQuestions.length >= targetResult.totalQuestions) {
        alert('This test was already completed. Start a new test to practice again.');
        return;
      }

      // Progress can be resumed regardless of age (24-hour restriction removed)

      // Navigate to quiz page with resume parameters including the specific question to resume from
      navigate(`/quiz/${subject}?resume=true&category=${category}&resumeFrom=${attemptedQuestions}`);
      
    } catch (error) {
      console.error('Error resuming last test:', error);
      alert('Error resuming last test. Please try again.');
    }
  };

  const clearResultsForSubject = async (subject) => {
    if (window.confirm(`Are you sure you want to delete all results for ${subject === 'all' ? 'all subjects' : subject}? This will clear all browser storage including cache.`)) {
      try {
        let deletedCount;
        
        if (subject === 'all') {
          // Clear all browser storage
          deletedCount = results.length;
          
          // 1. Clear IndexedDB via FileStorageService
          await fileStorage.deleteAllResults();
          
          // 2. Clear localStorage (quiz results, progress, etc.)
          const localStorageKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress'))) {
              localStorageKeys.push(key);
            }
          }
          localStorageKeys.forEach(key => localStorage.removeItem(key));
          
          // 3. Clear sessionStorage
          const sessionStorageKeys = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress'))) {
              sessionStorageKeys.push(key);
            }
          }
          sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
          
          console.log(`Cleared ${localStorageKeys.length} localStorage keys and ${sessionStorageKeys.length} sessionStorage keys`);
          
        } else {
          // Clear specific subject data
          const subjectResults = results.filter(r => r.subject === subject);
          deletedCount = subjectResults.length;
          
          // 1. Clear IndexedDB for subject
          await fileStorage.deleteResultsBySubject(subject);
          
          // 2. Clear localStorage for subject
          const localStorageKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress')) && key.includes(subject)) {
              localStorageKeys.push(key);
            }
          }
          localStorageKeys.forEach(key => localStorage.removeItem(key));
          
          // 3. Clear sessionStorage for subject
          const sessionStorageKeys = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('quiz') || key.includes('result') || key.includes('progress')) && key.includes(subject)) {
              sessionStorageKeys.push(key);
            }
          }
          sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
          
          console.log(`Cleared ${localStorageKeys.length} localStorage keys and ${sessionStorageKeys.length} sessionStorage keys for ${subject}`);
        }
        
        // Reload results after clearing
        const updatedResults = await fileStorage.getAllResults();
        setResults(updatedResults);
        
        if (updatedResults.length === 0) {
          setError('No results found. Complete a quiz to see results here.');
        }
        
        alert(`Successfully deleted ${deletedCount} result(s) and cleared all browser storage for ${subject === 'all' ? 'all subjects' : subject}.`);
      } catch (error) {
        console.error('Error clearing results:', error);
        alert('Error clearing results. Please try again.');
      }
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h1 className="results-title">📊 Results</h1>
                <div className="results-actions">
          <button className="btn" onClick={() => navigate('/')}>🏠 Home</button>
          <button className="btn" onClick={() => window.location.reload()}>🔄 Refresh</button>
          {currentResultCanResume && (
            <button className="btn" onClick={resumeLastTest}>🔄 Resume This Test</button>
          )}
          <button className="btn" onClick={() => exportResults()}>📥 Export All</button>
          <button className="btn" onClick={() => importResults()}>📤 Import</button> <select 
            className="clear-results-select" 
            onChange={(e) => {
              if (e.target.value) {
                clearResultsForSubject(e.target.value);
                e.target.value = '';
              }
            }}
            value=""
          >
            <option value="">🗑️ Clear Results</option>
            <option value="all">Clear All Results</option>
            {subjects.filter(s => s !== 'all').map(subject => (
              <option key={subject} value={subject}>Clear {subject} Results</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && (
        <div className="error" onClick={error.includes('Corrupted data') ? clearCorruptedData : undefined}>
          {error}
          {error.includes('Corrupted data') && (
            <span style={{ fontSize: '0.9em', opacity: 0.8 }}> (Click to fix)</span>
          )}
        </div>
      )}
      
      {/* Show WrongAnswersReview when a result is selected */}
      {selectedResult && (
        <WrongAnswersReview 
          result={selectedResult} 
          onBack={() => setSelectedResult(null)}
        />
      )}
      
      {!loading && !error && !selectedResult && (
        <>
          {results.length === 0 && (
            <div className="notice">No results yet.</div>
          )}
          <div className="tabs">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Results</button>
            <button className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>By Subject</button>
            <button className={`tab ${activeTab === 'wrong-answers' ? 'active' : ''}`} onClick={() => setActiveTab('wrong-answers')}>Wrong Answers</button>
          </div>

          {activeTab === 'overview' && summary && (
            <div className="overview-grid">
              <div className="stat-card fade-in" style={{ background: 'linear-gradient(135deg, #4CAF50, #81C784)' }}>
                <div className="stat-label">Total Tests</div>
                <div className="stat-value">{summary.total}</div>
              </div>
              <div className="stat-card fade-in" style={{ background: 'linear-gradient(135deg, #2196F3, #64B5F6)' }}>
                <div className="stat-label">Average Accuracy</div>
                <div className="stat-value">{summary.avgAccuracy}%</div>
              </div>
              <div className="stat-card fade-in" style={{ background: 'linear-gradient(135deg, #FF9800, #FFB74D)' }}>
                <div className="stat-label">Best Subject</div>
                <div className="stat-value">{summary.best ? summary.best.subject : '-'}</div>
              </div>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="cards-grid">
              {results.map((r, idx) => {
                const attempted = r.attemptedQuestions ?? r.total ?? 0;
                const correct = r.correctAnswers ?? r.score ?? 0;
                const wrong = attempted - correct;
                const percent = r.percentage ?? (attempted > 0 ? Math.round((correct / attempted) * 100) : 0);
                const ts = r.timestamp || r.date;
                const dateStr = ts ? new Date(ts).toLocaleString() : '-';
                const ringColor = percent >= 90 ? '#4CAF50' : percent >= 70 ? '#2196F3' : percent >= 50 ? '#FF9800' : '#F44336';
                const hasWrongAnswers = wrong > 0;
                
                return (
                  <div 
                    key={idx} 
                    className={`result-card slide-up ${hasWrongAnswers ? 'selectable' : ''}`}
                    onClick={hasWrongAnswers ? (e) => {
                      console.log('Clicked on result with wrong answers:', r);
                      e.stopPropagation();
                      setSelectedResult(r);
                    } : undefined}
                  >
                    <div className="result-card-header">
                      <div className="subject-chip">{r.subject || '-'}</div>
                      <div className="date-text">{dateStr}</div>
                      {hasWrongAnswers && (
                        <div className="wrong-answers-indicator" title="Click to review wrong answers">
                          🔍 {wrong} Wrong
                        </div>
                      )}
                    </div>
                    <div className="result-card-body">
                      <div className="progress-ring" style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #eee 0deg)` }}>
                        <div className="progress-ring-inner">{percent}%</div>
                      </div>
                      <div className="result-details">
                        <div className="detail"><span>Category:</span> {r.category || '-'}</div>
                        <div className="detail"><span>Score:</span> {correct}/{attempted}</div>
                        <div className="detail"><span>Wrong:</span> <span className="wrong-count">{wrong}</span></div>
                        <div className="detail"><span>Grade:</span> {r.grade || '-'}</div>
                        <div className="detail"><span>Source:</span> {r.source}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="subjects-section">
              <div className="subject-pills">
                {subjects.map(s => (
                  <button key={s} className={`pill ${subjectFilter === s ? 'active' : ''}`} onClick={() => setSubjectFilter(s)}>
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
              <div className="cards-grid">
                {filteredResults.map((r, idx) => {
                  const attempted = r.attemptedQuestions ?? r.total ?? 0;
                  const correct = r.correctAnswers ?? r.score ?? 0;
                  const wrong = attempted - correct;
                  const percent = r.percentage ?? (attempted > 0 ? Math.round((correct / attempted) * 100) : 0);
                  const ts = r.timestamp || r.date;
                  const dateStr = ts ? new Date(ts).toLocaleString() : '-';
                  const ringColor = percent >= 90 ? '#4CAF50' : percent >= 70 ? '#2196F3' : percent >= 50 ? '#FF9800' : '#F44336';
                  const hasWrongAnswers = wrong > 0;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`result-card slide-up ${hasWrongAnswers ? 'selectable' : ''}`}
                      onClick={hasWrongAnswers ? () => setSelectedResult(r) : undefined}
                    >
                      <div className="result-card-header">
                        <div className="subject-chip">{r.subject || '-'}</div>
                        <div className="date-text">{dateStr}</div>
                        {hasWrongAnswers && (
                          <div className="wrong-answers-indicator" title="Click to review wrong answers">
                            🔍 {wrong} Wrong
                          </div>
                        )}
                      </div>
                      <div className="result-card-body">
                        <div className="progress-ring" style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #eee 0deg)` }}>
                          <div className="progress-ring-inner">{percent}%</div>
                        </div>
                        <div className="result-details">
                          <div className="detail"><span>Category:</span> {r.category || '-'}</div>
                          <div className="detail"><span>Score:</span> {correct}/{attempted}</div>
                          <div className="detail"><span>Wrong:</span> <span className="wrong-count">{wrong}</span></div>
                          <div className="detail"><span>Grade:</span> {r.grade || '-'}</div>
                          <div className="detail"><span>Source:</span> {r.source}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'wrong-answers' && (
            <div className="wrong-answers-section">
              <div className="wrong-answers-header">
                <h3>🔍 Review Wrong Answers</h3>
                <p>Select a test result to review the questions you answered incorrectly</p>
              </div>
              
              {!selectedResult ? (
                <div className="result-selection">
                  <div className="result-cards">
                    {results.map((r, idx) => {
                      const attempted = r.attemptedQuestions ?? r.total ?? 0;
                      const correct = r.correctAnswers ?? r.score ?? 0;
                      const wrong = attempted - correct;
                      const percent = r.percentage ?? (attempted > 0 ? Math.round((correct / attempted) * 100) : 0);
                      const ts = r.timestamp || r.date;
                      const dateStr = ts ? new Date(ts).toLocaleString() : '-';
                      
                      if (wrong === 0) return null; // Only show results with wrong answers
                      
                      return (
                        <div key={idx} className="result-card selectable" onClick={() => setSelectedResult(r)}>
                          <div className="result-card-header">
                            <div className="subject-chip">{r.subject || '-'}</div>
                            <div className="date-text">{dateStr}</div>
                          </div>
                          <div className="result-card-body">
                            <div className="wrong-answers-summary">
                              <div className="wrong-count">{wrong} Wrong Answers</div>
                              <div className="accuracy">{percent}% Accuracy</div>
                            </div>
                            <div className="result-details">
                              <div className="detail"><span>Score:</span> {correct}/{attempted}</div>
                              <div className="detail"><span>Grade:</span> {r.grade || '-'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {results.filter(r => {
                    const attempted = r.attemptedQuestions ?? r.total ?? 0;
                    const correct = r.correctAnswers ?? r.score ?? 0;
                    return (attempted - correct) > 0;
                  }).length === 0 && (
                    <div className="no-wrong-answers">
                      <p>🎉 Great job! No wrong answers found in any test results.</p>
                    </div>
                  )}
                </div>
              ) : (
                <WrongAnswersReview 
                  result={selectedResult} 
                  onBack={() => {
                    setSelectedResult(null);
                    setActiveTab('all'); // Go back to All Results tab
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wrong Answers Review Component
function WrongAnswersReview({ result, onBack }) {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  
  const subject = result.subject;
  const category = result.category || 'all';
  const wrongAnswers = result.wrongAnswers || [];
  
  console.log('WrongAnswersReview received:', {
    subject,
    category,
    totalWrongAnswers: wrongAnswers.length,
    wrongAnswers: wrongAnswers.slice(0, 2) // Show first 2 for debugging
  });
  
  if (wrongAnswers.length === 0) {
    return (
      <div className="wrong-answers-review">
        <div className="review-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Results
          </button>
          <h3>Wrong Answers Review</h3>
          <div className="test-info">
            <span className="subject">{subject}</span>
            <span className="category">{category === 'all' ? 'All Categories' : category}</span>
            <span className="score">Score: {result.score}/{result.total}</span>
          </div>
        </div>
        
        <div className="no-wrong-answers">
          <p>🎉 Great job! No wrong answers in this test.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="wrong-answers-review">
      <div className="review-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Results
        </button>
        <h3>Wrong Answers Review</h3>
        <div className="test-info">
          <span className="subject">{subject}</span>
          <span className="category">{category === 'all' ? 'All Categories' : category}</span>
          <span className="score">Score: {result.score}/{result.total}</span>
        </div>
      </div>
      
      <div className="wrong-answers-list">
        {wrongAnswers.map((wrong, idx) => (
          <div key={idx} className="wrong-answer-item">
            <div className="question-header" onClick={() => {
              setExpandedQuestions(prev => {
                const newSet = new Set(prev);
                if (newSet.has(idx)) {
                  newSet.delete(idx);
                } else {
                  newSet.add(idx);
                }
                return newSet;
              });
            }}>
              <span className="question-number">Question {wrong.questionIndex + 1}</span>
              <span className="expand-icon">{expandedQuestions.has(idx) ? '▼' : '▶'}</span>
            </div>
            
            {expandedQuestions.has(idx) && (
              <div className="question-details">
                <div className="question-text">{wrong.question}</div>
                
                <div className="answer-comparison">
                  <div className="user-answer wrong">
                    <label>Your Answer:</label>
                    <div className="answer-content">{wrong.userAnswer}</div>
                  </div>
                  
                  <div className="correct-answer right">
                    <label>Correct Answer{wrong.correctAnswers.length > 1 ? 's' : ''}:</label>
                    <div className="answer-content">
                      {wrong.correctAnswers.map((answer, i) => (
                        <div key={i} className="correct-option">{answer}</div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {wrong.explanation && (
                  <div className="explanation">
                    <label>💡 Explanation:</label>
                    <div className="explanation-text">{wrong.explanation}</div>
                  </div>
                )}
                
                {wrong.options && wrong.options.length > 0 && (
                  <div className="all-options">
                    <label>All Options:</label>
                    <div className="options-list">
                      {wrong.options.map((option, i) => {
                        const isCorrect = wrong.correctAnswers.includes(option);
                        const isUserAnswer = option === wrong.userAnswer;
                        let className = 'option-item';
                        if (isCorrect) className += ' correct';
                        if (isUserAnswer && !isCorrect) className += ' user-wrong';
                        
                        return (
                          <div key={i} className={className}>
                            {option}
                            {isCorrect && <span className="check">✓</span>}
                            {isUserAnswer && !isCorrect && <span className="cross">✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Results;