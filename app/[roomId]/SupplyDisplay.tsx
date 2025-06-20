// --- FILE: app/[roomId]/SupplyDisplay.tsx (UI微調整版) ---
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card as CardType } from '../../types';
import CardComponent from '../../components/Card';
import PlaceholderCard from '../../components/PlaceholderCard';
import { CopyUrlButton } from '../../components/CopyUrlButton';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import Sidebar from '../../components/Sidebar';
import { Bars3Icon, XMarkIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { EXPANSION_ORDER } from '../../lib/constants';

type Placeholder = { id: string; type: 'placeholder' };
type DisplayItem = CardType | Placeholder;
type SortKey = 'cost' | 'name' | 'expansion';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allExpansions, setAllExpansions] = useState<string[]>([]);
  const [selectedExpansions, setSelectedExpansions] = useState<Set<string>>(new Set());
  const [allCards, setAllCards] = useState<CardType[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: expansionData } = await supabase.from('cards').select('expansion');
      if (expansionData) {
        const uniqueExpansions = [...new Set(expansionData.map(c => c.expansion))];
        uniqueExpansions.sort((a, b) => {
          const indexA = EXPANSION_ORDER.indexOf(a);
          const indexB = EXPANSION_ORDER.indexOf(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setAllExpansions(uniqueExpansions);
        const currentExps = new Set(initialCards.map(c => c.expansion));
        setSelectedExpansions(currentExps);
      }
      const { data: allCardsData } = await supabase.from('cards').select('*').order('cost').order('name');
      if (allCardsData) {
        setAllCards(allCardsData);
      }
    };
    fetchInitialData();
  }, [initialCards]);

  useEffect(() => {
    if (newlyAddedCardIds.size > 0) {
      const timer = setTimeout(() => setNewlyAddedCardIds(new Set()), 2500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedCardIds]);

  const sortedItems = useMemo(() => {
    return [...displayItems].sort((a, b) => {
      const aIsCard = isCard(a);
      const bIsCard = isCard(b);
      const aExpansionIndex = aIsCard ? EXPANSION_ORDER.indexOf(a.expansion) : Infinity;
      const bExpansionIndex = bIsCard ? EXPANSION_ORDER.indexOf(b.expansion) : Infinity;
      const aCost = aIsCard ? a.cost : -1;
      const bCost = bIsCard ? b.cost : -1;
      const aName = aIsCard ? a.name : '空き枠';
      const bName = bIsCard ? b.name : '空き枠';
      if (sortBy === 'expansion') {
        const expansionCompare = aExpansionIndex - bExpansionIndex;
        if (expansionCompare !== 0) return expansionCompare;
        return aCost - bCost || aName.localeCompare(bName, 'ja');
      }
      if (sortBy === 'cost') {
        return aCost - bCost || aName.localeCompare(bName, 'ja');
      }
      if (sortBy === 'name') {
        return aName.localeCompare(bName, 'ja');
      }
      return 0;
    });
  }, [displayItems, sortBy]);

  const handleExpansionChange = (expansionName: string) => {
    setSelectedExpansions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expansionName)) newSet.delete(expansionName);
      else newSet.add(expansionName);
      return newSet;
    });
  };

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
      prevItems.map(item => (selectedIds.has(item.id) ? { id: crypto.randomUUID(), type: 'placeholder' } : item))
    );
    setSelectedIds(new Set());
  };

  const handleRerollSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsRerolling(true);
    setError(null);
    const selectedExpansionsArray = Array.from(selectedExpansions);
    if (selectedExpansionsArray.length === 0) {
      setError("再抽選に使用する拡張セットを少なくとも1つ選択してください。");
      setIsRerolling(false);
      return;
    }
    try {
      const currentCardIds = displayItems.filter(isCard).map(c => c.id);
      const { data: availableCards, error: fetchError } = await supabase.from('cards').select('id').in('expansion', selectedExpansionsArray).not('id', 'in', `(${currentCardIds.join(',') || '""'})`);
      if (fetchError) throw new Error(fetchError.message);
      if (!availableCards || availableCards.length < selectedIds.size) throw new Error('選択された拡張セットに、再抽選するためのカードが不足しています。');
      const newCardIds = shuffle(availableCards).slice(0, selectedIds.size).map(c => c.id);
      const { data: newFullCards, error: newCardsError } = await supabase.from('cards').select('*').in('id', newCardIds);
      if (newCardsError || !newFullCards) throw new Error(newCardsError?.message || 'カード取得失敗');
      const newCardsQueue = [...newFullCards];
      const newDisplayItems = displayItems.map(item => (selectedIds.has(item.id) ? newCardsQueue.shift()! : item));
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
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform" aria-label="メニューを開閉">
        <div className="relative h-6 w-6">
          <XMarkIcon className={`h-6 w-6 absolute transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} />
          <Bars3Icon className={`h-6 w-6 absolute transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0' : 'opacity-100'}`} />
        </div>
      </button>
      <div className={`fixed inset-0 z-30 transition-opacity duration-300 ${isSidebarOpen ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 z-40 w-4/5 max-w-lg bg-gray-50 dark:bg-gray-800 transform transition-transform duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar allCards={allCards} allExpansions={allExpansions} selectedExpansions={selectedExpansions} onExpansionChange={handleExpansionChange} />
      </div>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-2 pt-14">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">生成されたサプライ</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">王国カード ({displayItems.filter(isCard).length}種類)</p>
            </div>
            <div className="flex items-center space-x-2">
              <CopyUrlButton />
              <Link href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">新しく生成</Link>
            </div>
          </div>
          
          <div className="my-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-bold mr-3">並び替え:</span>
              <button onClick={() => setSortBy('cost')} className={`px-3 py-1 rounded ${sortBy === 'cost' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>コスト</button>
              <button onClick={() => setSortBy('expansion')} className={`ml-2 px-3 py-1 rounded ${sortBy === 'expansion' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>拡張</button>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handleRerollSelected} disabled={selectedIds.size === 0 || isRerolling} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                {isRerolling ? <LoadingSpinner /> : <ArrowPathIcon className="h-5 w-5 mr-2" />}
                再抽選
              </button>
              <button onClick={handleReplaceWithPlaceholder} disabled={selectedIds.size === 0 || displayItems.filter(item => selectedIds.has(item.id) && isCard(item)).length === 0} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                <TrashIcon className="h-5 w-5 mr-2" />
                削除
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-center text-red-500">{error}</p>}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {sortedItems.map((item) => isCard(item) ? (<CardComponent key={item.id} card={item} isSelected={selectedIds.has(item.id)} onToggleSelect={handleToggleSelect} isNew={newlyAddedCardIds.has(item.id)}/>) : (<PlaceholderCard key={item.id} placeholder={item} isSelected={selectedIds.has(item.id)} onToggleSelect={handleToggleSelect}/>))}
          </div>
        </div>
      </main>
    </div>
  );
}
