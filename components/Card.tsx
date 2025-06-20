// --- FILE: components/Card.tsx (更新版) ---
import Image from 'next/image';
import { Card } from '../types';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const CoinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
    </svg>
);

type CardProps = {
  card: Card;
  // ★ isSelected と onToggleSelect をオプショナル（任意）にする
  isSelected?: boolean;
  onToggleSelect?: (cardId: string) => void;
  isNew?: boolean;
};

export default function CardComponent({ card, isSelected = false, onToggleSelect, isNew = false }: CardProps) {
  return (
    <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent'} ${onToggleSelect ? 'cursor-pointer' : ''} ${isNew ? 'animate-fade-in-out' : ''}`}
        // ★ onToggleSelect がある場合のみクリックイベントを設定
        onClick={onToggleSelect ? () => onToggleSelect(card.id) : undefined}
    >
        <div className="aspect-[5/7] relative">
            <Image
                src={card.image || 'https://placehold.co/200x280/e2e8f0/cbd5e0?text=No+Image'}
                alt={card.name}
                layout="fill"
                objectFit="cover"
                className="group-hover:scale-105 transition-transform duration-300"
                unoptimized
            />
            {/* ★ isSelected と onToggleSelect がある場合のみチェックアイコンを表示 */}
            {onToggleSelect && isSelected && (
                <CheckCircleIcon className="absolute top-2 right-2 h-6 w-6 text-indigo-600" />
            )}
        </div>
        <div className="p-3 text-center">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate" title={card.name}>
                {card.name}
            </h3>
            <div className="flex items-center justify-center mt-1 text-gray-500 dark:text-gray-400">
                <CoinIcon />
                <span className="ml-1 font-semibold text-lg">{card.cost}</span>
            </div>
        </div>
    </div>
  );
}
