'use client';

import { useState } from 'react';
import { PaperAirplaneIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './LoadingSpinner';


export function PostToDiscordButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handlePost = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: window.location.href }),
      });

      if (!response.ok) {
        throw new Error('Failed to post');
      }

      setStatus('success');

    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
        if(status !== 'idle') {
            setTimeout(() => setStatus('idle'), 3000);
        }
    }
  };

  const buttonContent = {
    idle: <><PaperAirplaneIcon className="h-5 w-5 mr-2" />Discordに投稿</>,
    loading: <><LoadingSpinner /><span>投稿中...</span></>,
    success: <><CheckIcon className="h-5 w-5 mr-2" />投稿しました！</>,
    error: <><ExclamationCircleIcon className="h-5 w-5 mr-2" />失敗しました</>,
  };

  const buttonClass = {
    idle: "bg-blue-600 hover:bg-blue-700",
    loading: "bg-blue-400 cursor-not-allowed",
    success: "bg-green-600",
    error: "bg-red-600",
  }

  return (
    <button
      onClick={handlePost}
      disabled={status === 'loading'}
      className={`flex items-center justify-center px-4 py-2 text-white font-semibold rounded-lg transition-colors ${buttonClass[status]}`}
    >
      {buttonContent[status]}
    </button>
  );
}