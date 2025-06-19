'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card as CardType } from '../../types';
import CardComponent from '../../components/Card';
import PlaceholderCard from '../../components/PlaceholderCard';
import { CopyUrlButton } from '../../components/CopyUrlButton';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type Placeholder = { id: string; type: 'placeholder' };
type DisplayItem = CardType | Placeholder;
type SortKey = 'cost' | 'name';

// ★ 修正点: 型ガードの判定方法を、より安全で確実なものに変更
// 'cost' プロパティの存在有無で、本物のカードか空き枠かを判定します。
const isCard = (item: DisplayItem): item is CardType => 'cost' in item;

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function SupplyDisplay({ initialCards }: { initialCards: CardType[] }) {
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>(initialCards);
  const [sortBy, setSortBy] = useState<SortKey>('cost');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRerolling, setIsRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyAddedCardIds, setNewlyAddedCardIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (newlyAddedCardIds.size > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedCardIds(new Set());
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedCardIds]);

  const sortedItems = useMemo(() => {
    return [...displayItems].sort((a, b) => {
      const aIsCard = isCard(a);
      const bIsCard = isCard(b);
      const aCost = aIsCard ? a.cost : -1;
      const bCost = bIsCard ? b.cost : -1;
      const aName = aIsCard ? a.name : '空き枠';
      const bName = bIsCard ? b.name : '空き枠';

      if (sortBy === 'cost') {
        return aCost - bCost || aName.localeCompare(bName, 'ja');
      }
      if (sortBy === 'name') {
        return aName.localeCompare(bName, 'ja');
      }
      return 0;
    });
  }, [displayItems, sortBy]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleReplaceWithPlaceholder = () => {
    if (selectedIds.size === 0) return;
    setDisplayItems(prevItems =>
      prevItems.map(item => {
        if (selectedIds.has(item.id)) {
          return { id: crypto.randomUUID(), type: 'placeholder' };
        }
        return item;
      })
    );
    setSelectedIds(new Set());
  };

  const handleRerollSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsRerolling(true);
    setError(null);
    try {
      const currentCardIds = displayItems.filter(isCard).map(c => c.id);
      const { data: availableCards, error: fetchError } = await supabase
        .from('cards')
        .select('id')
        .not('id', 'in', `(${currentCardIds.join(',') || '""'})`);

      if (fetchError) throw new Error(fetchError.message);
      if (!availableCards || availableCards.length < selectedIds.size) {
        throw new Error('再抽選するためのカードが不足しています。');
      }

      const newCardIds = shuffle(availableCards).slice(0, selectedIds.size).map(c => c.id);
      const { data: newFullCards, error: newCardsError } = await supabase
        .from('cards')
        .select('*')
        .in('id', newCardIds);
      if (newCardsError || !newFullCards) throw new Error(newCardsError?.message || 'カード取得失敗');

      const newCardsQueue = [...newFullCards];
      const newDisplayItems = displayItems.map(item => {
          if (selectedIds.has(item.id)) {
              return newCardsQueue.shift()!;
          }
          return item;
      });
      setDisplayItems(newDisplayItems);
      setNewlyAddedCardIds(new Set(newFullCards.map(c => c.id)));
      setSelectedIds(new Set());

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRerolling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">生成されたサプライ</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">王国カード ({displayItems.filter(isCard).length}種類)</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
             <CopyUrlButton />
             <Link href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                新しく生成
             </Link>
          </div>
      </div>
      
      <div className="my-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-bold mr-3">並び替え:</span>
          <button onClick={() => setSortBy('cost')} className={`px-3 py-1 rounded ${sortBy === 'cost' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>コスト</button>
          <button onClick={() => setSortBy('name')} className={`ml-2 px-3 py-1 rounded ${sortBy === 'name' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>名前</button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRerollSelected}
            disabled={selectedIds.size === 0 || isRerolling}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {isRerolling && <LoadingSpinner />}
            選択枠を再抽選
          </button>
          <button 
            onClick={handleReplaceWithPlaceholder}
            disabled={selectedIds.size === 0 || displayItems.filter(item => selectedIds.has(item.id) && isCard(item)).length === 0}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            選択カードを空き枠に
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-center text-red-500">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {sortedItems.map((item) => (
          isCard(item) ? (
            <CardComponent
              key={item.id}
              card={item}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
              isNew={newlyAddedCardIds.has(item.id)}
            />
          ) : (
            <PlaceholderCard
              key={item.id}
              placeholder={item}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
            />
          )
        ))}
      </div>
    </div>
  );
}