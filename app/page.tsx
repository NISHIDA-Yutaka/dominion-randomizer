'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSupply = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. 全カードのIDを取得
      console.log('Fetching card IDs from Supabase...');
      const { data: cardIds, error: fetchError } = await supabase
        .from('cards')
        .select('id');

      // ★★★ 修正ポイント 1: cardsテーブル取得時のエラーを詳細に表示 ★★★
      if (fetchError) {
        console.error('Supabase fetch error details:', fetchError);
        throw new Error(`カードデータの取得に失敗しました: ${fetchError.message}`);
      }

      console.log(`Successfully fetched ${cardIds?.length || 0} card IDs.`);
      if (!cardIds || cardIds.length < 10) {
        throw new Error('カードデータが10枚未満です。Supabaseにデータを追加してください。');
      }

      // 2. ランダムに10枚選ぶ
      const shuffledCards = shuffle(cardIds);
      const selectedCardIds = shuffledCards.slice(0, 10).map(c => c.id);
      console.log('Selected card IDs:', selectedCardIds);

      // 3. 新しいroomを作成し、カードIDの配列を保存
      console.log('Inserting new room into Supabase...');
      const { data: newRoom, error: insertError } = await supabase
        .from('rooms')
        .insert({ cards: selectedCardIds })
        .select('id')
        .single();

      // ★★★ 修正ポイント 2: roomsテーブル挿入時のエラーを詳細に表示 ★★★
      if (insertError) {
        console.error('Supabase insert error details:', insertError);
        throw new Error(`サプライの保存に失敗しました: ${insertError.message}`);
      }

      if (!newRoom) {
        throw new Error('サプライの作成に失敗しました。');
      }

      console.log('Successfully created room with ID:', newRoom.id);
      // 4. 生成されたサプライのページにリダイレクト
      router.push(`/${newRoom.id}`);

    } catch (err: any) {
      // ★★★ 修正ポイント 3: catchブロックで完全なエラーオブジェクトをログに出力 ★★★
      console.error('An error occurred in handleGenerateSupply:', err);
      setError(err.message || 'サプライの生成中に予期せぬエラーが発生しました。');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
        ドミニオンサプライ生成
      </h1>
      <p className="text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
        ボタンをクリックして、ランダムな10枚の王国カードセットを生成し、
        友達と共有しましょう。
      </p>
      <button
        onClick={handleGenerateSupply}
        disabled={isLoading}
        className="flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 text-xl"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>生成中...</span>
          </>
        ) : (
          'サプライを生成！'
        )}
      </button>
      {error && <p className="mt-4 text-red-500 font-semibold">{error}</p>}
    </div>
  );
}