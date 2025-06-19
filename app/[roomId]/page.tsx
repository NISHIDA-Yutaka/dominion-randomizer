import { supabase } from '../../lib/supabaseClient';
import { Card as CardType } from '../../types';
import CardComponent from '../../components/Card';
import Link from 'next/link';
import { CopyUrlButton } from '../../components/CopyUrlButton';

type Props = {
  params: { roomId: string };
};

// ページのメタデータを動的に設定
export async function generateMetadata({ params }: Props) {
    return {
        title: `サプライ: ${params.roomId.substring(0, 8)}...`,
        description: '生成されたドミニオンのサプライです。',
    };
}


async function getSupply(roomId: string): Promise<CardType[] | null> {
    try {
        // 1. roomIdからカードIDのリストを取得
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('cards')
            .eq('id', roomId)
            .single();

        if (roomError || !roomData) {
            console.error('Room not found:', roomError);
            return null;
        }

        const cardIds = roomData.cards as string[];
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            return null;
        }

        // 2. カードIDリストに一致するカードの詳細情報を取得
        const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .in('id', cardIds);
        
        if (cardsError) {
            console.error('Error fetching cards:', cardsError);
            return null;
        }
        
        // 元の順番を保持するようにソート
        const sortedCards = cardIds.map(id => cardsData.find(card => card.id === id)!);

        return sortedCards;

    } catch (err) {
        console.error(err);
        return null;
    }
}

export default async function RoomPage({ params }: Props) {
  const supplyCards = await getSupply(params.roomId);

  if (!supplyCards) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">サプライが見つかりません</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">URLが正しいか確認してください。</p>
        <Link href="/" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">生成されたサプライ</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">王国カード (10種類)</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
             <CopyUrlButton />
             <Link href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                新しく生成
             </Link>
          </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {supplyCards.map((card) => (
          <CardComponent key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}