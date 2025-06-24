// --- FILE: app/page.tsx (並び替え機能を追加) ---
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EXPANSION_ORDER } from '../lib/constants'; // ★ 並び順をインポート

type SupplyConstraints = {
  includeDraw: boolean;
  includeAction: boolean;
  includeBuy: boolean;
  includeTrash: boolean;
  includeGain: boolean;
  attackSetting: 'mixed' | 'forbidden';
  reactionSetting: 'mixed' | 'required' | 'forbidden';
};

// (shuffle function remains the same)
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

  const [expansions, setExpansions] = useState<string[]>([]);
  const [selectedExpansions, setSelectedExpansions] = useState<Set<string>>(new Set());
  const [isLoadingExpansions, setIsLoadingExpansions] = useState(true);

  // 条件のUIの状態を管理する
  const [constraints, setConstraints] = useState<SupplyConstraints>({
    includeDraw: false,
    includeAction: false,
    includeBuy: false,
    includeTrash: false,
    includeGain: false,
    attackSetting: 'mixed',
    reactionSetting: 'mixed',
  });

  // チェックボックスの状態を更新するハンドラ
  const handleConstraintChange = (key: keyof Omit<SupplyConstraints, 'attackSetting' | 'reactionSetting'>, value: boolean) => {
    setConstraints(prev => ({ ...prev, [key]: value }));
  };
  
  // ボタントグルの状態を更新するハンドラ
  const handleToggleSetting = (
    key: 'attackSetting' | 'reactionSetting',
    value: 'required' | 'forbidden'
  ) => {
    setConstraints(prev => ({
      ...prev,
      // @ts-ignore
      [key]: prev[key] === value ? 'mixed' : value,
    }));
  };
  
  // アタックとリアクション設定の連動
  useEffect(() => {
    if (constraints.attackSetting === 'forbidden' && constraints.reactionSetting === 'required') {
      setConstraints(prev => ({ ...prev, reactionSetting: 'mixed' }));
    }
  }, [constraints.attackSetting]);
  // --- ここまで追加 ---

  useEffect(() => {
    const fetchExpansions = async () => {
      setIsLoadingExpansions(true);
      const { data, error } = await supabase.from('cards').select('expansion');

      if (error) {
        console.error('Error fetching expansions:', error);
        setError('拡張セットの読み込みに失敗しました。');
      } else if (data) {
        const uniqueExpansions = [...new Set(data.map(c => c.expansion))];
        
        // ★ ここから変更: 定義した順序でソートする
        uniqueExpansions.sort((a, b) => {
          const indexA = EXPANSION_ORDER.indexOf(a);
          const indexB = EXPANSION_ORDER.indexOf(b);
          // もし定義にない拡張セットがあれば末尾に回す
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        // ★ ここまで変更

        setExpansions(uniqueExpansions);
        setSelectedExpansions(new Set(uniqueExpansions));
      }
      setIsLoadingExpansions(false);
    };

    fetchExpansions();
  }, []);

  // (handleExpansionChange and handleGenerateSupply remain the same)
  const handleExpansionChange = (expansionName: string) => {
    setSelectedExpansions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expansionName)) {
        newSet.delete(expansionName);
      } else {
        newSet.add(expansionName);
      }
      return newSet;
    });
  };

  const handleGenerateSupply = async () => {
    setIsLoading(true);
    setError(null);
    const selectedExpansionsArray = Array.from(selectedExpansions);
    if (selectedExpansionsArray.length === 0) {
      setError('少なくとも1つの拡張セットを選択してください。');
      setIsLoading(false);
      return;
    }
    try {
      const { data: cardIds, error: fetchError } = await supabase.from('cards').select('id').in('expansion', selectedExpansionsArray);
      if (fetchError) throw fetchError;
      if (!cardIds || cardIds.length < 10) throw new Error('選択された拡張セットのカードが10枚未満です。');
      const shuffledCards = shuffle(cardIds);
      const selectedCardIds = shuffledCards.slice(0, 10).map(c => c.id);
      const { data: newRoom, error: insertError } = await supabase.from('rooms').insert({ cards: selectedCardIds }).select('id').single();
      if (insertError) throw insertError;
      if (!newRoom) throw new Error('サプライの作成に失敗しました。');
      router.push(`/${newRoom.id}`);
    } catch (err: any) {
      console.error('Error generating supply:', err);
      setError(err.message || 'サプライの生成中にエラーが発生しました。');
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
        ドミニオンサプライ生成
      </h1>
      <p className="text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
        使用する拡張セットを選択して、ランダムなサプライを生成しましょう。
      </p>
      <div className="w-full max-w-2xl p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-left text-gray-900 dark:text-white">拡張セット選択</h2>
        {isLoadingExpansions ? (
          <div className="flex items-center justify-center text-gray-500"><LoadingSpinner /><span className="ml-2">読み込み中...</span></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
            {expansions.map(exp => (
              <label key={exp} className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={selectedExpansions.has(exp)} onChange={() => handleExpansionChange(exp)} />
                <span className={selectedExpansions.has(exp) ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}>{exp}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 条件指定UIのJSX */}
      <div className="w-full max-w-2xl p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 text-left text-gray-900 dark:text-white">条件を指定して生成</h2>
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded" checked={constraints.includeDraw} onChange={(e) => handleConstraintChange('includeDraw', e.target.checked)} />
                    <span className={constraints.includeDraw ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>+2ドローを含める</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded" checked={constraints.includeAction} onChange={(e) => handleConstraintChange('includeAction', e.target.checked)} />
                    <span className={constraints.includeAction ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>+2アクションを含める</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded" checked={constraints.includeBuy} onChange={(e) => handleConstraintChange('includeBuy', e.target.checked)} />
                    <span className={constraints.includeBuy ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>+購入を含める</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded" checked={constraints.includeTrash} onChange={(e) => handleConstraintChange('includeTrash', e.target.checked)} />
                    <span className={constraints.includeTrash ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>廃棄を含める</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 rounded" checked={constraints.includeGain} onChange={(e) => handleConstraintChange('includeGain', e.target.checked)} />
                    <span className={constraints.includeGain ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>獲得を含める</span>
                </label>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <label className="font-semibold block mb-2">アタックカード</label>
                    <div className="flex space-x-2">
                       <button onClick={() => handleToggleSetting('attackSetting', 'forbidden')} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.attackSetting === 'forbidden' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                           必ず含めない
                       </button>
                    </div>
                </div>
                <div>
                    <label className="font-semibold block mb-2">リアクションカード</label>
                    <div className="flex space-x-2">
                         <button onClick={() => handleToggleSetting('reactionSetting', 'required')} disabled={constraints.attackSetting === 'forbidden'} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.reactionSetting === 'required' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed`}>アタック対策に含める</button>
                         <button onClick={() => handleToggleSetting('reactionSetting', 'forbidden')} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.reactionSetting === 'forbidden' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>必ず含めない</button>
                    </div>
                </div>
            </div>
          </div>
      </div>
      {/* --- ここまで追加 --- */}
      
      <button onClick={handleGenerateSupply} disabled={isLoading || isLoadingExpansions} className="flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 text-xl">
        {isLoading ? (<><LoadingSpinner /><span>生成中...</span></>) : ('サプライを生成！')}
      </button>
      {error && <p className="mt-4 text-red-500 font-semibold">{error}</p>}
    </div>
  );
}
