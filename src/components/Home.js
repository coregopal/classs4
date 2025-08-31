import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const subjects = [
  { id: 'hindi', name: 'हिंदी', color: '#FF6B6B' },
  { id: 'english_language', name: 'English Language', color: '#4ECDC4' },
  { id: 'english_literature', name: 'English Literature', color: '#7FDBFF' },
  { id: 'math', name: 'Mathematics', color: '#45B7D1' },
  { id: 'science', name: 'Science', color: '#96CEB4' },
  { id: 'sst', name: 'Social Studies', color: '#FFA07A' },
  { id: 'gk', name: 'General Knowledge', color: '#FFB347' },
  { id: 'ict', name: 'Computers - ICT', color: '#7B68EE' },
  { id: 'marathi', name: 'मराठी', color: '#FF69B4' }
];

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <h1 className="home-title">Grade 3 Learning Quiz</h1>
      <div className="subjects-grid">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="subject-card"
            style={{ backgroundColor: subject.color }}
            onClick={() => navigate(`/quiz/${subject.id}`)}
          >
            <h2>{subject.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home; 