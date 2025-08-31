import React, { useState, useEffect } from 'react';
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
  const [attemptedQuestions, setAttemptedQuestions] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quizStarted, setQuizStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());

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

  const playWrongSound = () => {
    if (!isMuted) {
      const audio = new Audio('/sounds/wrong.mp3');
      audio.play().catch(error => console.log('Audio playback failed:', error));
    }
  };

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
    setAttemptedQuestions(0);
    setSelectedAnswer(null);
    setProgressWidth(0);
    setShowResult(false);
  }, [selectedCategory]);

  useEffect(() => {
    if (!subjectsData[subject] || questions.length === 0) {
      navigate('/');
    }
  }, [subject, navigate, questions.length]);

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer || isTransitioning || isAlreadyAnswered) return;
    
    setSelectedAnswer(answer);
    setIsTransitioning(true);
    
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
    return (
      <div className="quiz-container">
        <div className="quiz-card result-card">
          <h2>Quiz Results - {selectedCategory}</h2>
          <div className="result-stats">
            <p>Total Questions: {questions.length}</p>
            <p>Attempted Questions: {attemptedCount}</p>
            <p>Correct Answers: {score}</p>
            <p>Score: {attemptedCount > 0 ? Math.round((score / attemptedCount) * 100) : 0}%</p>
          </div>
          <div className="result-actions">
            <button onClick={() => navigate('/')}>Back to Home</button>
            <button onClick={() => {
              setShowResult(false);
              setCurrentQuestion(0);
              setScore(0);
              setAnsweredQuestions(new Set());
              setSelectedAnswer(null);
            }}>Try Again</button>
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