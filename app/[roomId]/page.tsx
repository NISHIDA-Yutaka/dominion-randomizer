import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../types';
import Link from 'next/link';
import SupplyDisplay from './SupplyDisplay';

// Propsの型定義を、より厳格なインライン形式に変更
// これにより、Next.jsのビルドシステムが求める型制約を満たします。
type PageProps = {
  params: { roomId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// ページのメタデータを動的に設定
export async function generateMetadata({ params }: Pick<PageProps, 'params'>) {
    const { roomId } = params;
    return {
        title: `サプライ: ${roomId.substring(0, 8)}...`,
        description: '生成されたドミニオンのサプライです。',
    };
}

async function getSupply(roomId: string): Promise<Card[] | null> {
    try {
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('cards')
            .eq('id', roomId)
            .single();

        if (roomError || !roomData) return null;

        const cardIds = roomData.cards as string[];
        if (!Array.isArray(cardIds) || cardIds.length === 0) return null;

        const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .in('id', cardIds);
        
        if (cardsError) return null;
        
        const sortedCards = cardIds.map(id => cardsData.find(card => card.id === id)!).filter(Boolean);
        return sortedCards;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// コンポーネントのPropsにも新しい型を適用
export default async function RoomPage({ params }: PageProps) {
  const { roomId } = params;
  const initialSupply = await getSupply(roomId);

  if (!initialSupply) {
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

  return <SupplyDisplay initialCards={initialSupply} />;
}