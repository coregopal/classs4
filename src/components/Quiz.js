import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import '../styles/Quiz.css';

// Import all question data
import hindiData from '../data/hindi.json';
import englishLanguageData from '../data/english_language.json';
import englishLiteratureData from '../data/english_literature.json';
import mathData from '../data/math.json';
import scienceData from '../data/science.json';
import gkData from '../data/gk.json';
import ictData from '../data/ict.json';
import sstData from '../data/sst.json';
import marathiData from '../data/marathi.json';

const subjectsData = {
  hindi: hindiData,
  english_language: englishLanguageData,
  english_literature: englishLiteratureData,
  math: mathData,
  science: scienceData,
  sst: sstData,
  gk: gkData,
  ict: ictData,
  marathi: marathiData
};

function Quiz() {
  const { subject } = useParams();
  const navigate = useNavigate();
  
  // All state declarations first
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quizStarted, setQuizStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const allQuestions = subjectsData[subject]?.questions || [];
  
  // Get unique categories
  const categories = ['all', ...new Set(allQuestions.map(q => q.category))];
  
  // Filter questions based on selected category
  const questions = selectedCategory === 'all' 
    ? allQuestions 
    : allQuestions.filter(q => q.category === selectedCategory);

  // Helper functions after state declarations
  const isCorrectAnswer = (answer) => {
    const question = questions[currentQuestion];
    if (!question) return false;
    
    if (Array.isArray(question.correct_answer)) {
      return question.correct_answer.includes(answer);
    }
    return question.correct_answer === answer;
  };

  const playCorrectSound = () => {
    if (!isMuted) {
      const audio = new Audio('/sounds/correct.mp3');
      audio.play().catch(error => console.log('Audio playback failed:', error));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const playWrongSound = useCallback(() => {
    if (!isMuted) {
      const audio = new Audio('/sounds/wrong.mp3');
      audio.play().catch(error => console.log('Audio playback failed:', error));
    }
  }, [isMuted]);

  const getCorrectAnswers = (question) => {
    if (question.correct_answers) {
      return question.correct_answers;
    } else if (Array.isArray(question.correct_answer)) {
      return question.correct_answer;
    } else {
      return [question.correct_answer];
    }
  };

  // Helper: Check if current question is already answered
  const isAlreadyAnswered = answeredQuestions.has(currentQuestion);

  // Helper: Get attempted questions count
  const attemptedCount = answeredQuestions.size;

  // Helper: Get remaining questions count
  const remainingCount = questions.length - attemptedCount;

  // Helper: Get options for current question safely
  const getOptions = (question) => {
    if (!question) return [];
    if (Array.isArray(question.options)) return question.options;
    return [];
  };

  // Reset state when category changes
  useEffect(() => {
    setAnsweredQuestions(new Set());
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setProgressWidth(0);
    setShowResult(false);
    setTimeLeft(30);
    setIsTimerRunning(false);
  }, [selectedCategory]);

  useEffect(() => {
    if (!subjectsData[subject] || questions.length === 0) {
      navigate('/');
    }
  }, [subject, navigate, questions.length]);

  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false);
    if (!answeredQuestions.has(currentQuestion)) {
      // Mark question as answered without scoring
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion));
      playWrongSound();
      
      // Auto-advance to next question after 2 seconds
      setTimeout(() => {
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          setShowResult(true);
        }
      }, 2000);
    }
  }, [answeredQuestions, currentQuestion, questions.length, playWrongSound]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0 && !showResult) {
      timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult) {
      // Time's up - auto-submit or move to next question
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isTimerRunning, showResult, handleTimeUp]);

  // Start timer when question changes
  useEffect(() => {
    if (quizStarted && !showResult) {
      setTimeLeft(30);
      setIsTimerRunning(true);
    }
  }, [currentQuestion, quizStarted, showResult]);

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer || isTransitioning || isAlreadyAnswered) return;
    
    setSelectedAnswer(answer);
    setIsTransitioning(true);
    setIsTimerRunning(false); // Stop timer when answer is selected
    
    // First show the correct/wrong answer
    const isCorrect = isCorrectAnswer(answer);
    if (isCorrect) {
      playCorrectSound();
      // Only increment score if not already answered
      if (!answeredQuestions.has(currentQuestion)) {
        setScore(prev => prev + 1);
      }
    } else {
      playWrongSound();
    }
    
    // Mark question as answered (unique)
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestion));
    
    // Wait 2 seconds before starting progress bar
    setTimeout(() => {
      // Start progress bar animation
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        setProgressWidth(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setProgressWidth(0);
          setIsTransitioning(false);
          
          // Mark question as answered and move to next
          if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          } else {
            setShowResult(true);
          }
          setSelectedAnswer(null);
        }
      }, 50);
    }, 2000);
  };

  const nextQuestion = () => {
    // If in transition, complete it immediately
    if (isTransitioning) {
      setProgressWidth(100);
      setTimeout(() => {
        setProgressWidth(0);
        setIsTransitioning(false);
        setSelectedAnswer(null);
        
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          saveTestResult();
          setShowResult(true);
        }
      }, 100);
      return;
    }

    // Normal transition
    setProgressWidth(0);
    setIsTransitioning(false);
    setSelectedAnswer(null);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      saveTestResult();
      setShowResult(true);
    }
  };

  const previousQuestion = () => {
    // If in transition, complete it immediately
    if (isTransitioning) {
      setProgressWidth(100);
      setTimeout(() => {
        setProgressWidth(0);
        setIsTransitioning(false);
        setSelectedAnswer(null);
        
        if (currentQuestion > 0) {
          setCurrentQuestion(currentQuestion - 1);
          // Don't allow changing previous answers
          if (answeredQuestions.has(currentQuestion - 1)) {
            setSelectedAnswer('checked');
          }
        }
      }, 100);
      return;
    }

    // Normal transition
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setProgressWidth(0);
      // Don't allow changing previous answers
      if (answeredQuestions.has(currentQuestion - 1)) {
        setSelectedAnswer('checked');
      }
    }
  };

  const skipTest = () => {
    setShowResult(true);
  };

  // Function to save test result
  const saveTestResult = async () => {
    try {
      const testData = {
        subject,
        category: selectedCategory,
        totalQuestions: questions.length,
        attemptedQuestions: attemptedCount,
        correctAnswers: score,
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch('/api/save-test-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      if (!response.ok) throw new Error('Failed to save test result');
    } catch (error) {
      console.error('Error saving test result:', error);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setAnsweredQuestions(new Set());
    setSelectedAnswer(null);
    setProgressWidth(0);
    setShowResult(false);
  };

  const getLanguageText = (subject) => {
    if (subject === 'hindi') {
      return {
        allCategories: 'सभी विषय',
        chooseAnswers: (count) => `चुनें ${count} सही उत्तर`,
        correctAnswers: 'सही उत्तर:',
        totalQuestions: 'कुल प्रश्न:',
      };
    }
    return {
      allCategories: 'All Categories',
      chooseAnswers: (count) => `Choose ${count} correct ${count > 1 ? 'answers' : 'answer'}`,
      correctAnswers: 'Correct Answers:',
      totalQuestions: 'Total Questions:',
    };
  };

  const languageText = getLanguageText(subject);

  // Add a check for empty questions
  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <h2>No questions available</h2>
          <button onClick={() => navigate('/')} className="start-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="quiz-container">
        <div className="quiz-card start-screen">
          <h2>{selectedCategory === 'all' ? languageText.allCategories : selectedCategory}</h2>
          <div className="category-select">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? languageText.allCategories : cat}
                </option>
              ))}
            </select>
          </div>
          <p>{languageText.totalQuestions} {questions.length}</p>
          <button className="start-button" onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    const percentage = attemptedCount > 0 ? Math.round((score / attemptedCount) * 100) : 0;
    const getGrade = (percent) => {
      if (percent >= 90) return { grade: 'A+', color: '#4CAF50', emoji: '🎉' };
      if (percent >= 80) return { grade: 'A', color: '#4CAF50', emoji: '🌟' };
      if (percent >= 70) return { grade: 'B+', color: '#8BC34A', emoji: '👍' };
      if (percent >= 60) return { grade: 'B', color: '#FFC107', emoji: '😊' };
      if (percent >= 50) return { grade: 'C', color: '#FF9800', emoji: '🤔' };
      return { grade: 'D', color: '#F44336', emoji: '📚' };
    };
    const gradeInfo = getGrade(percentage);

    return (
      <div className="quiz-container">
        <div className="quiz-card result-card">
          <div className="result-header">
            <h2>🎯 Quiz Results</h2>
            <div className="subject-info">
              <span className="subject-name">{subjectsData[subject]?.subjectName || subject}</span>
              <span className="category-name">{selectedCategory === 'all' ? 'All Categories' : selectedCategory}</span>
            </div>
          </div>
          
          <div className="result-summary">
            <div className="grade-display" style={{ backgroundColor: gradeInfo.color }}>
              <div className="grade-emoji">{gradeInfo.emoji}</div>
              <div className="grade-text">{gradeInfo.grade}</div>
              <div className="grade-percentage">{percentage}%</div>
            </div>
            
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Total Questions</span>
                <span className="stat-value">{questions.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Attempted</span>
                <span className="stat-value">{attemptedCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Correct Answers</span>
                <span className="stat-value correct">{score}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Wrong Answers</span>
                <span className="stat-value wrong">{attemptedCount - score}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{attemptedCount > 0 ? Math.round((score / attemptedCount) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="performance-feedback">
            <h3>📊 Performance Analysis</h3>
            <div className="feedback-text">
              {percentage >= 90 && "Excellent! You've mastered this subject! 🌟"}
              {percentage >= 80 && percentage < 90 && "Great job! You have a strong understanding of this topic! 👍"}
              {percentage >= 70 && percentage < 80 && "Good work! You're on the right track! 😊"}
              {percentage >= 60 && percentage < 70 && "Not bad! Keep practicing to improve further! 📚"}
              {percentage >= 50 && percentage < 60 && "You're making progress! Review the material and try again! 💪"}
              {percentage < 50 && "Don't worry! Practice makes perfect. Review the study materials and try again! 📖"}
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              🏠 Back to Home
            </button>
            <button className="btn-secondary" onClick={() => {
              setShowResult(false);
              setCurrentQuestion(0);
              setScore(0);
              setAnsweredQuestions(new Set());
              setSelectedAnswer(null);
              setTimeLeft(30);
              setIsTimerRunning(false);
            }}>
              🔄 Try Again
            </button>
            <button className="btn-tertiary" onClick={() => {
              // Save result to localStorage
              const resultData = {
                subject: subject,
                category: selectedCategory,
                score: score,
                total: attemptedCount,
                percentage: percentage,
                grade: gradeInfo.grade,
                date: new Date().toISOString(),
                timestamp: Date.now()
              };
              
              const savedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
              savedResults.push(resultData);
              localStorage.setItem('quizResults', JSON.stringify(savedResults));
              
              alert('Result saved! You can view your progress history.');
            }}>
              💾 Save Result
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-card">
        <div className="quiz-header">
          <div className="quiz-info">
            <div className="questions-progress">
              <span className="completed">Completed: {attemptedCount}</span>
              <span className="remaining">Remaining: {remainingCount}</span>
            </div>
            <div className="score">Score: {score}/{attemptedCount}</div>
            <div className="timer">
              <span className={`timer-text ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
                ⏰ {timeLeft}s
              </span>
            </div>
          </div>
          <div className="quiz-controls">
            <button 
              className={`sound-toggle ${isMuted ? 'muted' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button className="skip-button" onClick={skipTest}>Leave Test</button>
          </div>
        </div>
        <div className="quiz-progress-info">
          <div className="questions-progress">
            Question {currentQuestion + 1} of {questions.length}
          </div>
          <div className="questions-status">
            <span className="completed">Completed: {attemptedCount}</span>
            <span className="remaining">Remaining: {remainingCount}</span>
          </div>
        </div>
        <div className="question-info">
          <div className="question">
            {questions[currentQuestion]?.question || 'Loading question...'}
          </div>
          <div className="correct-answers-count">
            {questions[currentQuestion] && 
              languageText.chooseAnswers(getCorrectAnswers(questions[currentQuestion]).length)}
          </div>
        </div>
        <div className="options">
          {/* Special handling for matching questions with dash-separated options */}
          {getOptions(questions[currentQuestion]).length > 0 && typeof getOptions(questions[currentQuestion])[0] === 'string' && getOptions(questions[currentQuestion])[0].includes('-') && getOptions(questions[currentQuestion])[0].includes(',') ? (
            (() => {
              // Use the correct answer to extract columns
              const correct = questions[currentQuestion].correct_answer;
              const pairs = correct.split(',').map(pair => pair.trim().split('-'));
              const columnA = pairs.map(pair => pair[0]);
              const columnB = pairs.map(pair => pair[1]);
              return (
                <div className="matching-question">
                  <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div>
                      <strong>Column A</strong>
                      <ol>
                        {columnA.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <strong>Column B</strong>
                      <ol>
                        {columnB.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  {/* Now show the answer options as buttons */}
                  <div className="matching-options">
                    {getOptions(questions[currentQuestion]).map((option, index) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrect = option === questions[currentQuestion].correct_answer;
                      const showAnswer = selectedAnswer !== null;
                      let optionClass = 'option';
                      if (showAnswer) {
                        if (isCorrect) {
                          optionClass += ' correct-answer';
                        } else if (isSelected) {
                          optionClass += ' wrong-answer';
                        }
                      } else if (isSelected) {
                        optionClass += ' selected';
                      }
                      return (
                        <button
                          key={index}
                          className={optionClass}
                          onClick={() => handleAnswerSelect(option)}
                          disabled={selectedAnswer !== null || isAlreadyAnswered}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : getOptions(questions[currentQuestion]).length > 0 ? (
            getOptions(questions[currentQuestion]).map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === questions[currentQuestion].correct_answer;
              const showAnswer = selectedAnswer !== null;
              let optionClass = 'option';
              if (showAnswer) {
                if (isCorrect) {
                  optionClass += ' correct-answer';
                } else if (isSelected) {
                  optionClass += ' wrong-answer';
                }
              } else if (isSelected) {
                optionClass += ' selected';
              }
              return (
                <button
                  key={index}
                  className={optionClass}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== null || isAlreadyAnswered}
                >
                  {option}
                </button>
              );
            })
          ) : (
            <div className="no-options">
              <em>No options provided. Please write your answer or skip.</em>
            </div>
          )}
        </div>
        {isTransitioning && (
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        )}
        <div className="quiz-footer">
          <div className="navigation-buttons">
            <button 
              onClick={previousQuestion} 
              className={currentQuestion === 0 ? 'disabled' : ''}
            >
              Previous
            </button>
            <button 
              onClick={nextQuestion}
            >
              Next
            </button>
          </div>
          <div className="score">
            Score: {score}/{attemptedCount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Quiz; 