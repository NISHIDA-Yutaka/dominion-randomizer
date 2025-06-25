// --- FILE: components/Card.tsx (デバッグ情報表示対応版) ---
import Image from 'next/image';
import { Card } from '../types';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { CurrencyDollarIcon } from '@heroicons/react/24/solid';

type CardProps = {
  card: Card;
  isSelected?: boolean;
  onToggleSelect?: (cardId: string) => void;
  isNew?: boolean;
};

export default function CardComponent({ card, isSelected = false, onToggleSelect, isNew = false }: CardProps) {
  return (
    <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent'} ${onToggleSelect ? 'cursor-pointer' : ''} ${isNew ? 'ring-4 ring-green-500' : 'ring-0 ring-transparent'}`}
        onClick={onToggleSelect ? () => onToggleSelect(card.id) : undefined}
    >
        <div className="aspect-[5/7] relative">
            <Image
                src={card.image || 'https://placehold.co/200x280/e2e8f0/cbd5e0?text=No+Image'}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 50vw, 300px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
            />
            {onToggleSelect && isSelected && (
                <CheckCircleIcon className="absolute top-2 right-2 h-6 w-6 text-indigo-600" />
            )}
        </div>
        <div className="p-3 text-center">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate" title={card.name}>
                {card.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-1">{card.expansion}</p>
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                <CurrencyDollarIcon className="w-5 h-5 text-yellow-500" />
                <span className="ml-1 font-semibold text-lg">{card.cost}</span>
            </div>

            {/* ★★★ ここから追加 ★★★ */}
            {/* 1. カードの「種類(type)」を表示 */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {card.type.join(' - ')}
            </p>
            {/* 2. カードの「タグ(tags)」をデバッグ用に表示 */}
            {card.tags && card.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center items-center gap-1" aria-label="カードのタグ">
                {card.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* ★★★ ここまで追加 ★★★ */}
        </div>
    </div>
  );
}