import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Results.css';

function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview | all | subjects
  const [subjectFilter, setSubjectFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/test-results');
        if (!resp.ok) throw new Error('Failed to fetch server results');
        const data = await resp.json();
        const serverResults = Array.isArray(data?.results) ? data.results : [];

        const local = JSON.parse(localStorage.getItem('quizResults') || '[]');

        const merged = [...serverResults.map(r => ({ ...r, source: 'server' })), ...local.map(r => ({ ...r, source: 'local' }))];

        // Sort by timestamp desc if available
        merged.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        setResults(merged);
      } catch (e) {
        const local = JSON.parse(localStorage.getItem('quizResults') || '[]');
        if (local.length === 0) {
          setError('No results found. Complete a quiz to see results here.');
        } else {
          setError('Showing local results only (server not reachable).');
        }
        const merged = local.map(r => ({ ...r, source: 'local' }));
        merged.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        setResults(merged);
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

  return (
    <div className="results-container">
      <div className="results-header">
        <h1 className="results-title">📊 Results</h1>
        <div className="results-actions">
          <button className="btn" onClick={() => navigate('/')}>🏠 Home</button>
          <button className="btn" onClick={() => window.location.reload()}>🔄 Refresh</button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {!loading && error && (
        <div className="notice">{error}</div>
      )}

      {!loading && results.length === 0 && (
        <div className="notice">No results yet.</div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="tabs">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Results</button>
            <button className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>By Subject</button>
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
                const percent = r.percentage ?? (attempted > 0 ? Math.round((correct / attempted) * 100) : 0);
                const ts = r.timestamp || r.date;
                const dateStr = ts ? new Date(ts).toLocaleString() : '-';
                const ringColor = percent >= 90 ? '#4CAF50' : percent >= 70 ? '#2196F3' : percent >= 50 ? '#FF9800' : '#F44336';
                return (
                  <div key={idx} className="result-card slide-up">
                    <div className="result-card-header">
                      <div className="subject-chip">{r.subject || '-'}</div>
                      <div className="date-text">{dateStr}</div>
                    </div>
                    <div className="result-card-body">
                      <div className="progress-ring" style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #eee 0deg)` }}>
                        <div className="progress-ring-inner">{percent}%</div>
                      </div>
                      <div className="result-details">
                        <div className="detail"><span>Category:</span> {r.category || '-'}</div>
                        <div className="detail"><span>Score:</span> {correct}/{attempted}</div>
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
                  const percent = r.percentage ?? (attempted > 0 ? Math.round((correct / attempted) * 100) : 0);
                  const ts = r.timestamp || r.date;
                  const dateStr = ts ? new Date(ts).toLocaleString() : '-';
                  const ringColor = percent >= 90 ? '#4CAF50' : percent >= 70 ? '#2196F3' : percent >= 50 ? '#FF9800' : '#F44336';
                  return (
                    <div key={idx} className="result-card slide-up">
                      <div className="result-card-header">
                        <div className="subject-chip">{r.subject || '-'}</div>
                        <div className="date-text">{dateStr}</div>
                      </div>
                      <div className="result-card-body">
                        <div className="progress-ring" style={{ background: `conic-gradient(${ringColor} ${percent * 3.6}deg, #eee 0deg)` }}>
                          <div className="progress-ring-inner">{percent}%</div>
                        </div>
                        <div className="result-details">
                          <div className="detail"><span>Category:</span> {r.category || '-'}</div>
                          <div className="detail"><span>Score:</span> {correct}/{attempted}</div>
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
        </>
      )}
    </div>
  );
}

export default Results;


