"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hostCode, setHostCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isHost) {
      // Handle host login
      const response = await fetch('/api/quiz-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostCode,
          categories: ['80s Music', '90s Music', 'Geography', 'Sport', 'TV & Film'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Save host code to localStorage
        localStorage.setItem('hostCode', hostCode);
        router.push(`/host/${data.data.hostId}`);
      } else {
        alert('Invalid host code');
      }
      return;
    }
    
    // Handle participant join
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    router.push(`/join?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">XQuizLive</h1>
          <p className="mt-2 text-sm text-gray-400">
            Real-time pub quiz for Twitter Spaces
          </p>
        </div>

        <div className="mt-8">
          <div className="flex justify-center space-x-4 mb-6">
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                !isHost ? 'bg-primary text-white' : 'bg-gray-700'
              }`}
              onClick={() => {
                setIsHost(false);
                setHostCode('');
              }}
            >
              Join Quiz
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                isHost ? 'bg-primary text-white' : 'bg-gray-700'
              }`}
              onClick={() => {
                setIsHost(true);
                setName('');
              }}
            >
              Host Quiz
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isHost ? (
              <div>
                <label
                  htmlFor="hostCode"
                  className="block text-sm font-medium text-gray-300"
                >
                  Host Code
                </label>
                <input
                  id="hostCode"
                  type="text"
                  value={hostCode}
                  onChange={(e) => setHostCode(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter host code"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-300"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {isHost ? 'Start Hosting' : 'Join Quiz'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
