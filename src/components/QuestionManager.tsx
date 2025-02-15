"use client";

import { useState, useRef } from 'react';
import { parseCSV, parseJSON, exportToCSV, exportToJSON } from '@/lib/utils/questionImport';

interface Question {
  _id: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export default function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const content = await file.text();
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
      const parsedQuestions = fileType === 'csv' ? parseCSV(content) : parseJSON(content);

      if (parsedQuestions.length === 0) {
        setError('No valid questions found in the file');
        return;
      }

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedQuestions),
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.data);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.message || 'Failed to import questions');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing file');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const content = format === 'csv' 
          ? exportToCSV(data.data)
          : exportToJSON(data.data);

        const blob = new Blob([content], { 
          type: format === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-questions.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError('No questions to export');
      }
    } catch (err: any) {
      setError(err.message || 'Error exporting questions');
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions?id=${questionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(questions.filter(q => q._id !== questionId));
      } else {
        setError(data.message || 'Failed to delete question');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting question');
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Question Manager</h2>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Import Questions (CSV or JSON)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-primary/90"
        />
        {loading && <p className="mt-2 text-sm text-gray-400">Importing questions...</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => handleExport('csv')}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
        >
          Export CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
        >
          Export JSON
        </button>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question._id}
            className="bg-gray-700 p-4 rounded-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-400">{question.category}</span>
              <button
                onClick={() => handleDelete(question._id)}
                className="text-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
            <p className="mb-2">{question.question}</p>
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    option === question.correctAnswer
                      ? 'bg-green-500/10 border border-green-500'
                      : 'bg-gray-600'
                  }`}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
