'use client';
import { useState, useEffect } from 'react';

export function CopyUrlButton() {
    const [isCopied, setIsCopied] = useState(false);
    const [url, setUrl] = useState('');

    useEffect(() => {
        // 'use client'のため、マウント後にwindowオブジェクトにアクセス
        if (typeof window !== 'undefined') {
            setUrl(window.location.href);
        }
    }, []);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // 2秒後に表示を元に戻す
        } catch (err) {
            console.error('Failed to copy: ', err);
            // alert()は避けるべきですが、代替UIがない場合のフォールバックとして残します。
            // 本番環境では、カスタムの通知コンポーネントに置き換えることを推奨します。
            console.log("URLのコピーに失敗しました。");
        }
    };

    return (
        <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
        >
            {isCopied ? 'コピーしました！' : 'URLをコピー'}
        </button>
    );
}