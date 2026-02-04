import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/Results.css';

function Results() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview | all | subjects | wrong-answers
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
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

  // Debug: Log when selectedResult changes
  useEffect(() => {
    if (selectedResult) {
      console.log('Selected result for wrong answers review:', selectedResult);
      console.log('Wrong answers data:', selectedResult.wrongAnswers);
    }
  }, [selectedResult]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/test-results');
        if (!resp.ok) throw new Error('Failed to fetch server results');
        const data = await resp.json();
        const serverResults = Array.isArray(data?.results) ? data.results : [];
        
        if (serverResults.length === 0) {
          setError('No results found. Complete a quiz to see results here.');
        } else {
          setError('');
        }
        
        setResults(serverResults);
      } catch (e) {
        setError('Error loading results from server. Please make sure the server is running on port 3001.');
        console.error('Error loading results:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  // Function to clear results for specific subject
  const clearResultsForSubject = async (subject) => {
    if (window.confirm(`Are you sure you want to delete all results for ${subject === 'all' ? 'all subjects' : subject}?`)) {
      try {
        const response = await fetch(`/api/test-results?subject=${subject}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to clear results');
        }
        
        const data = await response.json();
        
        // Reload results after clearing
        const resp = await fetch('/api/test-results');
        if (resp.ok) {
          const resultsData = await resp.json();
          setResults(Array.isArray(resultsData?.results) ? resultsData.results : []);
          
          if (resultsData.results.length === 0) {
            setError('No results found. Complete a quiz to see results here.');
          }
        }
        
        alert(data.message || `Results for ${subject === 'all' ? 'all subjects' : subject} have been cleared.`);
      } catch (error) {
        console.error('Error clearing results:', error);
        alert('Error clearing results. Please make sure the server is running on port 3001.');
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
          <select 
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
      {error && <div className="error">{error}</div>}
      
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


