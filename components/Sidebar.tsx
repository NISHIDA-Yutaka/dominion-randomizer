'use client';

import { Card as CardType } from '../types';
import { Disclosure, Transition } from '@headlessui/react';
import { ChevronUpIcon, CheckIcon } from '@heroicons/react/20/solid';
import CardComponent from './Card';

type SidebarProps = {
  allCards: CardType[];
  allExpansions: string[];
  selectedExpansions: Set<string>;
  onExpansionChange: (expansionName: string) => void;
  onCardAdd: (cardId: string) => void;
  // ★ 変更点1: サプライ内のカードIDセットを受け取るプロパティを追加
  supplyCardIds: Set<string>;
};

export default function Sidebar({
  allCards,
  allExpansions,
  selectedExpansions,
  onExpansionChange,
  onCardAdd,
  supplyCardIds, // ★ 変更点2: propsから受け取る
}: SidebarProps) {
  const groupedCards = allCards.reduce((acc, card) => {
    (acc[card.expansion] = acc[card.expansion] || []).push(card);
    return acc;
  }, {} as Record<string, CardType[]>);

  return (
    <aside className="h-full w-full bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto">
      <div className="pt-16 md:pt-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">サプライ情報・設定</h2>

        <div className="w-full mx-auto rounded-2xl bg-white dark:bg-gray-900 p-2 space-y-2">
          {/* 拡張セット選択アコーディオン */}
          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full justify-between rounded-lg bg-indigo-100 dark:bg-indigo-900/50 px-4 py-2 text-left text-sm font-medium text-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/75">
                  <span>拡張セットの選択</span>
                  <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-indigo-500 transition-transform`} />
                </Disclosure.Button>
                <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500 dark:text-gray-300 space-y-3">
                  {allExpansions.map(exp => (
                    <label key={exp} className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input type="checkbox" className="h-5 w-5 appearance-none rounded border-2 border-gray-300 dark:border-gray-600 checked:bg-indigo-600 checked:border-indigo-600 focus:ring-indigo-500 transition-all duration-200 group-hover:border-indigo-400" checked={selectedExpansions.has(exp)} onChange={() => onExpansionChange(exp)} />
                        {selectedExpansions.has(exp) && <CheckIcon className="h-4 w-4 absolute left-0.5 text-white pointer-events-none" />}
                      </div>
                      <span className="font-medium">{exp}</span>
                    </label>
                  ))}
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>

          {/* 全カード一覧アコーディオン */}
          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full justify-between rounded-lg bg-indigo-100 dark:bg-indigo-900/50 px-4 py-2 text-left text-sm font-medium text-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/75">
                  <span>全カード一覧 ({allCards.length}枚)</span>
                  <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-indigo-500 transition-transform`} />
                </Disclosure.Button>
                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="p-2 text-sm text-gray-500 dark:text-gray-400 space-y-2">
                    {allExpansions.map(expansion => {
                      const cardsInExpansion = groupedCards[expansion];
                      if (!cardsInExpansion) return null;
                      return (
                        <Disclosure key={expansion} as="div" className="mt-2">
                          {({ open: expansionOpen }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-100 dark:bg-gray-700/50 px-3 py-2 text-left text-xs font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600/50 focus:outline-none focus-visible:ring focus-visible:ring-gray-500/75">
                                <span>{expansion} ({cardsInExpansion.length}枚)</span>
                                <ChevronUpIcon className={`${expansionOpen ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-500 transition-transform`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="pt-2 pb-2">
                                {/* ★ 変更点3: grid-cols-4に変更 */}
                                <div className="grid grid-cols-4 gap-2">
                                  {cardsInExpansion.map(card => {
                                    // ★ 変更点4: カードがサプライに含まれているかチェック
                                    const isCardInSupply = supplyCardIds.has(card.id);
                                    return (
                                      <CardComponent
                                        key={card.id}
                                        card={card}
                                        // ★ 変更点5: 含まれている場合は選択済みのスタイルを適用し、クリックできないようにする
                                        isSelected={isCardInSupply}
                                        onToggleSelect={isCardInSupply ? undefined : onCardAdd}
                                      />
                                    );
                                  })}
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                      );
                    })}
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        </div>
      </div>
    </aside>
  );
}