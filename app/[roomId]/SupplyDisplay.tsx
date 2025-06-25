// --- FILE: app/[roomId]/SupplyDisplay.tsx (条件引き継ぎ対応版) ---
'use client';

// ★★★ 1. import文にusePersistentStateを追加 ★★★
import { useState, useMemo, useEffect, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState'; // 追加
import Link from 'next/link';
import { Card as CardType, Room } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import CardComponent from '../../components/Card';
import PlaceholderCard from '../../components/PlaceholderCard';
import { CopyUrlButton } from '../../components/CopyUrlButton';
import { supabase } from '../../lib/supabase/client';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import Sidebar from '../../components/Sidebar';
import { Bars3Icon, XMarkIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { EXPANSION_ORDER } from '../../lib/constants';

import { Disclosure, Transition } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';

type Placeholder = { id: string; type: 'placeholder' };
type DisplayItem = CardType | Placeholder;
type SortKey = 'cost' | 'expansion';
const isCard = (item: DisplayItem): item is CardType => 'cost' in item;
function shuffle<T>(array: T[]): T[] { const newArray = [...array]; for (let i = newArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; } return newArray; }

const channelManager: { [roomId: string]: RealtimeChannel } = {};

type SupplyConstraints = {
  includeDraw: boolean;
  includeAction: boolean;
  includeBuy: boolean;
  includeTrash: boolean;
  includeGain: boolean;
  attackSetting: 'mixed' | 'forbidden';
  reactionSetting: 'mixed' | 'required' | 'forbidden';
};

export default function SupplyDisplay({ initialCards, roomId }: { initialCards: CardType[], roomId: string }) {
  const [cards, setCards] = useState<CardType[]>(initialCards);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>(
    Array.from({ length: Math.max(0, 10 - initialCards.length) }, () => ({ id: crypto.randomUUID(), type: 'placeholder' }))
  );
  const [sortBy, setSortBy] = useState<SortKey>('cost');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRerolling, setIsRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyAddedCardIds, setNewlyAddedCardIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allExpansions, setAllExpansions] = useState<string[]>([]);
  const [selectedExpansions, setSelectedExpansions] = useState<Set<string>>(new Set());
  const [allCards, setAllCards] = useState<CardType[]>([]);

  // ★★★ 2. useStateをusePersistentStateに置き換え ★★★
  // トップページとキーを合わせることで、設定が共有されます。
  const [constraints, setConstraints] = usePersistentState<SupplyConstraints>('dominion-constraints', {
    includeDraw: false,
    includeAction: false,
    includeBuy: false,
    includeTrash: false,
    includeGain: false,
    attackSetting: 'mixed',
    reactionSetting: 'mixed',
  });
  // ★★★ 変更点はここまで ★★★

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
  }, [constraints.attackSetting, constraints.reactionSetting, setConstraints]);

  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const areAllCardsSelected = cards.length > 0 && selectedIds.size === cards.length && cards.every(c => selectedIds.has(c.id));

  useEffect(() => {
    if (!channelManager[roomId]) {
      console.log(`[Realtime] Channel for room ${roomId} does not exist. Creating and subscribing...`);
      const channel = supabase.channel(`room-${roomId}`);
      channel.on<Room>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        async (payload) => {
          console.log('[Realtime] Change received!', payload);
          const newCardIds = payload.new.cards as string[];
          if (!newCardIds) return;
          const currentCardIds = cardsRef.current.map(c => c.id);
          const addedIds = newCardIds.filter(id => !currentCardIds.includes(id));
          if (addedIds.length > 0) {
            setNewlyAddedCardIds(new Set(addedIds));
          }
          const { data, error } = await supabase.from('cards').select('*').in('id', newCardIds);
          if (error) {
            console.error('[Realtime] Error fetching new cards:', error);
            return;
          }
          const sortedNewCards = newCardIds.map(id => data.find(c => c.id === id)!).filter(Boolean);
          setCards(sortedNewCards);
          setPlaceholders(Array.from({ length: Math.max(0, 10 - sortedNewCards.length) }, () => ({ id: crypto.randomUUID(), type: 'placeholder' })));
        }
      ).subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully SUBSCRIBED to room: ${roomId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Subscription error for room ${roomId}:`, err);
          setError('リアルタイム接続に失敗しました。');
        }
      });
      channelManager[roomId] = channel;
    } else {
      console.log(`[Realtime] Channel for room ${roomId} already exists. Using existing channel.`);
    }
  }, [roomId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: expansionData } = await supabase.from('cards').select('expansion');
      if (expansionData) { const uniqueExpansions = [...new Set(expansionData.map(c => c.expansion))]; uniqueExpansions.sort((a, b) => { const indexA = EXPANSION_ORDER.indexOf(a); const indexB = EXPANSION_ORDER.indexOf(b); if (indexA === -1) return 1; if (indexB === -1) return -1; return indexA - indexB; }); setAllExpansions(uniqueExpansions); const currentExps = new Set(initialCards.map(c => c.expansion)); setSelectedExpansions(currentExps); }
      const { data: allCardsData } = await supabase.from('cards').select('*').order('cost').order('name');
      if (allCardsData) { setAllCards(allCardsData); }
    };
    fetchInitialData();
  }, [initialCards]);

  useEffect(() => { if (newlyAddedCardIds.size > 0) { const timer = setTimeout(() => setNewlyAddedCardIds(new Set()), 2500); return () => clearTimeout(timer); } }, [newlyAddedCardIds]);

  const supplyCardIds = useMemo(() => new Set(cards.map(c => c.id)), [cards]);
  const displayItems = useMemo<DisplayItem[]>(() => [...cards, ...placeholders], [cards, placeholders]);

  const sortedItems = useMemo(() => {
    return [...displayItems].sort((a, b) => {
      const aIsCard = isCard(a);
      const bIsCard = isCard(b);

      if (aIsCard && !bIsCard) return -1;
      if (!aIsCard && bIsCard) return 1;
      if (!aIsCard && !bIsCard) return 0;

      const cardA = a as CardType;
      const cardB = b as CardType;

      if (sortBy === 'expansion') {
        const indexA = EXPANSION_ORDER.indexOf(cardA.expansion);
        const indexB = EXPANSION_ORDER.indexOf(cardB.expansion);
        const expansionCompare = (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        if (expansionCompare !== 0) return expansionCompare;
      }

      const costCompare = cardA.cost - cardB.cost;
      if (costCompare !== 0) return costCompare;

      return cardA.name.localeCompare(cardB.name, 'ja');
    });
  }, [displayItems, sortBy]);

  const handleExpansionChange = (expansionName: string) => { setSelectedExpansions(prev => { const newSet = new Set(prev); if (newSet.has(expansionName)) newSet.delete(expansionName); else newSet.add(expansionName); return newSet; }); };
  const handleToggleSelect = (id: string) => { setSelectedIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
  const handleToggleSelectAll = () => {
    if (areAllCardsSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cards.map(c => c.id)));
    }
  };

  const handleReplaceWithPlaceholder = async () => {
    const cardsToDeleteIds = new Set(Array.from(selectedIds).filter(id => displayItems.find(item => item.id === id && isCard(item))));
    if (cardsToDeleteIds.size === 0) return;
    const newCardIds = cards.map(c => c.id).filter(id => !cardsToDeleteIds.has(id));
    try {
      const { error: updateError } = await supabase.from('rooms').update({ cards: newCardIds }).eq('id', roomId);
      if (updateError) throw new Error(updateError.message);
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(`削除失敗: ${err.message}`);
    }
  };

  const handleRerollSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsRerolling(true);
    setError(null);
    const selectedExpansionsArray = Array.from(selectedExpansions);
    if (selectedExpansionsArray.length === 0) { setError("再抽選に使用する拡張セットを少なくとも1つ選択してください。"); setIsRerolling(false); return; }
    try {
      const rerollCount = selectedIds.size;
      const currentCardIds = cards.map(c => c.id).filter(id => !selectedIds.has(id));
      const { data: availableCards, error: fetchError } = await supabase.from('cards').select('id').in('expansion', selectedExpansionsArray).not('id', 'in', `(${currentCardIds.join(',') || '""'})`);
      if (fetchError) throw new Error(fetchError.message);
      if (!availableCards || availableCards.length < rerollCount) throw new Error('選択された拡張セットに、再抽選するためのカードが不足しています。');
      const newCardIdsToAdd = shuffle(availableCards).slice(0, rerollCount).map(c => c.id);
      const newTotalCardIds = [...currentCardIds, ...newCardIdsToAdd];
      const { error: updateError } = await supabase.from('rooms').update({ cards: newTotalCardIds }).eq('id', roomId);
      if (updateError) throw new Error(updateError.message);
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(`再抽選失敗: ${err.message}`);
    } finally {
      setIsRerolling(false);
    }
  };

  const handleAddCard = async (cardId: string) => {
    if (cardsRef.current.some(card => card.id === cardId)) {
      console.log(`Card ${cardId} is already in the supply.`);
      return;
    }
    const newCardIds = [...cardsRef.current.map(c => c.id), cardId];
    const { error } = await supabase.from('rooms').update({ cards: newCardIds }).eq('id', roomId);
    if (error) {
      setError(`カードの追加に失敗しました: ${error.message}`);
    }
  };

    // (return以下のJSXは変更なし)
    return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform" aria-label="メニューを開閉"><div className="relative h-6 w-6"><XMarkIcon className={`h-6 w-6 absolute transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} /><Bars3Icon className={`h-6 w-6 absolute transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0' : 'opacity-100'}`} /></div></button>
      <div className={`fixed inset-0 z-30 transition-opacity duration-300 ${isSidebarOpen ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 z-40 w-4/5 transform transition-transform duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          allCards={allCards}
          allExpansions={allExpansions}
          selectedExpansions={selectedExpansions}
          onExpansionChange={handleExpansionChange}
          onCardAdd={handleAddCard}
          supplyCardIds={supplyCardIds}
        />
      </div>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-2 pt-14">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">生成されたサプライ</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">王国カード ({cards.length}種類)</p>
            </div>
            <div className="flex items-center space-x-2">
              <CopyUrlButton />
              <Link href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">新しく生成</Link>
            </div>
          </div>
          <div className="my-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
              <div className="flex items-center">
                <span className="font-bold mr-3">並び替え:</span>
                <button onClick={() => setSortBy('cost')} className={`px-3 py-1 rounded ${sortBy === 'cost' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>コスト</button>
                <button onClick={() => setSortBy('expansion')} className={`ml-2 px-3 py-1 rounded ${sortBy === 'expansion' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>拡張</button>
              </div>
              <div className="flex items-center">
                <span className="font-bold mr-3">選択:</span>
                <button onClick={handleToggleSelectAll} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50" disabled={cards.length === 0}>
                  {areAllCardsSelected ? '選択をクリア' : 'すべて選択'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRerollSelected} disabled={selectedIds.size === 0 || isRerolling} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                {isRerolling ? <LoadingSpinner /> : <ArrowPathIcon className="h-5 w-5 mr-2" />}再抽選
              </button>
              <button onClick={handleReplaceWithPlaceholder} disabled={selectedIds.size === 0 || Array.from(selectedIds).every(id => !cards.find(c => c.id === id))} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                <TrashIcon className="h-5 w-5 mr-2" />削除
              </button>
            </div>
          </div>

          <div className="my-4 w-full bg-white dark:bg-gray-800 rounded-lg shadow">
            <Disclosure>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-100 dark:bg-gray-700/50 px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600/50 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/75">
                    <span>再抽選の条件指定</span>
                    <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-500 transition-transform`} />
                  </Disclosure.Button>
                  <Transition
                    show={open}
                    enter="transition duration-100 ease-out"
                    enterFrom="transform -translate-y-2 opacity-0"
                    enterTo="transform translate-y-0 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform translate-y-0 opacity-100"
                    leaveTo="transform -translate-y-2 opacity-0"
                  >
                    <Disclosure.Panel className="p-4 text-sm text-gray-600 dark:text-gray-300">
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
                            <label className="font-semibold block mb-2 text-gray-800 dark:text-gray-200">アタックカード</label>
                            <div className="flex space-x-2">
                              <button onClick={() => handleToggleSetting('attackSetting', 'forbidden')} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.attackSetting === 'forbidden' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                必ず含めない
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="font-semibold block mb-2 text-gray-800 dark:text-gray-200">リアクションカード</label>
                            <div className="flex space-x-2">
                              <button onClick={() => handleToggleSetting('reactionSetting', 'required')} disabled={constraints.attackSetting === 'forbidden'} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.reactionSetting === 'required' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed`}>
                                アタック対策に含める
                              </button>
                              <button onClick={() => handleToggleSetting('reactionSetting', 'forbidden')} className={`cursor-pointer px-3 py-1 rounded-md text-sm font-semibold ${constraints.reactionSetting === 'forbidden' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                必ず含めない
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          </div>
          
          {error && <p className="mt-2 text-center text-red-500 font-bold">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {sortedItems.map((item) =>
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}