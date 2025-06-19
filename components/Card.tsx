import Image from 'next/image';
import { Card } from '../types';

type CardProps = {
  card: Card;
};

export default function CardComponent({ card }: CardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      <div className="aspect-[5/7] relative">
        <Image
          src={card.image || 'https://placehold.co/200x280/e2e8f0/cbd5e0?text=No+Image'}
          alt={card.name}
          layout="fill"
          objectFit="cover"
          className="group-hover:scale-105 transition-transform duration-300"
          unoptimized // 外部URLのためNext.jsの画像最適化を無効化
        />
      </div>
      <div className="p-3 text-center">
        <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate" title={card.name}>
          {card.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{card.expansion}</p>
      </div>
    </div>
  );
}