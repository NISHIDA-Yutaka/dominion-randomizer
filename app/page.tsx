// --- FILE: app/page.tsx (サプライ生成ロジック修正版) ---
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EXPANSION_ORDER } from '@/lib/constants';
import usePersistentState from '@/hooks/usePersistentState';
import { Card as CardType } from '@/types';

type SupplyConstraints = {
  includeDraw: boolean;
  includeAction: boolean;
  includeBuy: boolean;
  includeTrash: boolean;
  includeGain: boolean;
  attackSetting: 'mixed' | 'forbidden';
  reactionSetting: 'mixed' | 'required' | 'forbidden';
};

// カードの配列をシャッフルするヘルパー関数
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// カードの特性とDBのタグ名をマッピング
const CONSTRAINT_TAG_MAP = {
    includeDraw: 'ドロー',
    includeAction: 'アクション', //  DBのtag名に合わせてください (例: '+2アクション')
    includeBuy: '購入権',        //  DBのtag名に合わせてください (例: '+1購入')
    includeTrash: '廃棄',
    includeGain: '獲得',
};

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expansions, setExpansions] = useState<string[]>([]);
  const [isLoadingExpansions, setIsLoadingExpansions] = useState(true);

  const [selectedExpansionsArray, setSelectedExpansionsArray] = usePersistentState<string[]>('dominion-expansions-array', []);
  const selectedExpansions = useMemo(() => new Set(selectedExpansionsArray), [selectedExpansionsArray]);

  const [constraints, setConstraints] = usePersistentState<SupplyConstraints>('dominion-constraints', {
    includeDraw: false,
    includeAction: false,
    includeBuy: false,
    includeTrash: false,
    includeGain: false,
    attackSetting: 'mixed',
    reactionSetting: 'mixed',
  });

  // (handleConstraintChange, handleToggleSetting, useEffectなどの既存の関数は変更なし)
  const handleConstraintChange = (key: keyof Omit<SupplyConstraints, 'attackSetting' | 'reactionSetting'>, value: boolean) => {
    setConstraints(prev => ({ ...prev, [key]: value }));
  };

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

  useEffect(() => {
    if (constraints.attackSetting === 'forbidden' && constraints.reactionSetting === 'required') {
      setConstraints(prev => ({ ...prev, reactionSetting: 'mixed' }));
    }
  }, [constraints, setConstraints]);


  useEffect(() => {
    const fetchExpansions = async () => {
      setIsLoadingExpansions(true);
      const { data, error } = await supabase.from('cards').select('expansion');
      if (error) {
        console.error('Error fetching expansions:', error);
        setError('拡張セットの読み込みに失敗しました。');
      } else if (data) {
        const uniqueExpansions = [...new Set(data.map(c => c.expansion))];
        uniqueExpansions.sort((a, b) => {
          const indexA = EXPANSION_ORDER.indexOf(a);
          const indexB = EXPANSION_ORDER.indexOf(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setExpansions(uniqueExpansions);
        if (localStorage.getItem('dominion-expansions-array') === null) {
          setSelectedExpansionsArray(uniqueExpansions);
        }
      }
      setIsLoadingExpansions(false);
    };
    fetchExpansions();
  }, [setSelectedExpansionsArray]);

  const handleExpansionChange = (expansionName: string) => {
    const newSet = new Set(selectedExpansionsArray);
    if (newSet.has(expansionName)) {
      newSet.delete(expansionName);
    } else {
      newSet.add(expansionName);
    }
    setSelectedExpansionsArray(Array.from(newSet));
  };
  
  const areAllExpansionsSelected = expansions.length > 0 && selectedExpansions.size === expansions.length;
  const handleToggleSelectAllExpansions = () => {
    if (areAllExpansionsSelected) {
      setSelectedExpansionsArray([]);
    } else {
      setSelectedExpansionsArray(expansions);
    }
  };


  // ★★★ ここからが修正対象の関数です ★★★
  const handleGenerateSupply = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const selectedExpansionsArray = Array.from(selectedExpansions);
      if (selectedExpansionsArray.length === 0) {
        throw new Error('少なくとも1つの拡張セットを選択してください。');
      }

      // Step 1: 基本的な条件でカード候補をDBから取得
      let query = supabase.from('cards').select('*').in('expansion', selectedExpansionsArray);

      if (constraints.attackSetting === 'forbidden') {
        query = query.not('type', 'cs', '{アタック}');
      }
      if (constraints.reactionSetting === 'forbidden') {
        query = query.not('type', 'cs', '{リアクション}');
      }
      // 注意: 「アタック対策に含める(required)」は複雑なため、このロジックでは未実装です。

      const { data: availableCards, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!availableCards) throw new Error('カードの取得に失敗しました。');

      // --- ここからクライアントサイドでの選出ロジック ---
      let finalCardIds = new Set<string>();
      let candidatePool = [...availableCards];

      // Step 2: "必ず含める" 条件のカードを選出
      for (const [key, tag] of Object.entries(CONSTRAINT_TAG_MAP)) {
        if (constraints[key as keyof typeof CONSTRAINT_TAG_MAP]) {
          const matchingCards = candidatePool.filter(card => card.tags?.includes(tag) && !finalCardIds.has(card.id));
          if (matchingCards.length === 0) {
            throw new Error(`「${tag}」を持つカードが、選択された拡張セット内に見つかりませんでした。`);
          }
          const randomCard = shuffle(matchingCards)[0];
          finalCardIds.add(randomCard.id);
          // 選出したカードを候補から削除
          candidatePool = candidatePool.filter(card => card.id !== randomCard.id);
        }
      }
      
      // Step 3: 残りのカードをランダムに選出
      const remainingSlots = 10 - finalCardIds.size;
      if (remainingSlots > 0) {
        if (candidatePool.length < remainingSlots) {
            throw new Error('条件を満たすカードが10枚に満たないため、サプライを生成できません。拡張セットや条件を見直してください。');
        }
        const remainingCards = shuffle(candidatePool).slice(0, remainingSlots);
        remainingCards.forEach(card => finalCardIds.add(card.id));
      }

      if (finalCardIds.size < 10) {
          throw new Error('不明なエラーにより、10枚のカードを選出できませんでした。');
      }

      // Step 4: サプライをDBに登録して画面遷移
      const { data: newRoom, error: insertError } = await supabase
        .from('rooms')
        .insert({ cards: Array.from(finalCardIds) })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!newRoom) throw new Error('サプライの作成に失敗しました。');

      router.push(`/${newRoom.id}`);

    } catch (err: any) {
      console.error('Error generating supply:', err);
      setError(err.message || 'サプライの生成中にエラーが発生しました。');
      setIsLoading(false);
    }
  };
  // ★★★ ここまでが修正対象の関数です ★★★


  // (return以下のJSXは変更なし)
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
        ドミニオンサプライ生成
      </h1>
      <p className="text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-300 max-w-2xl">
        使用する拡張セットを選択して、ランダムなサプライを生成しましょう。
      </p>

      <div className="w-full max-w-3xl p-6 mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-left text-gray-900 dark:text-white">拡張セット選択</h2>
            <button
                onClick={handleToggleSelectAllExpansions}
                className="cursor-pointer px-3 py-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-gray-700"
                disabled={isLoadingExpansions}
            >
                {areAllExpansionsSelected ? 'すべて選択解除' : 'すべて選択'}
            </button>
        </div>
        {isLoadingExpansions ? (
          <div className="flex items-center justify-center text-gray-500"><LoadingSpinner /><span className="ml-2">読み込み中...</span></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-left">
            {expansions.map(exp => (
              <label key={exp} className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={selectedExpansions.has(exp)} onChange={() => handleExpansionChange(exp)} />
                <span className={selectedExpansions.has(exp) ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}>{exp}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
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

      <button onClick={handleGenerateSupply} disabled={isLoading || isLoadingExpansions} className="flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 text-xl">
        {isLoading ? (<><LoadingSpinner /><span>生成中...</span></>) : ('サプライを生成！')}
      </button>
      {error && <p className="mt-4 text-red-500 font-semibold">{error}</p>}
    </div>
  );
}