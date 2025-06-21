// --- FILE: app/[roomId]/page.tsx (キャッシュ完全無効化版) ---

import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../types';
import Link from 'next/link';
import SupplyDisplay from './SupplyDisplay';
import type { Metadata, ResolvingMetadata } from 'next';

// ★ 修正点1: 2種類の方法でキャッシュを無効化し、常に最新のデータを取得するようにする
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: { roomId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
    const { roomId } = params;
    return {
        title: `サプライ: ${roomId.substring(0, 8)}...`,
        description: '生成されたドミニオンのサプライです。',
    };
}

// ★ 修正点2: DB問い合わせ時にキャッシュを使わないオプションを追加
async function getSupply(roomId: string): Promise<Card[] | null> {
    try {
        console.log(`Fetching supply for room [${roomId}] at ${new Date().toISOString()}`);
        const { data: roomData, error: roomError } = await supabase.from('rooms').select('cards').eq('id', roomId).single();

        if (roomError || !roomData) {
            console.error(`Could not fetch room [${roomId}]:`, roomError);
            return null;
        }
        const cardIds = roomData.cards as string[];
        if (!Array.isArray(cardIds) || cardIds.length === 0) return null;
        
        const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*').in('id', cardIds);

        if (cardsError) {
            console.error(`Could not fetch cards for room [${roomId}]:`, cardsError);
            return null;
        }
        const sortedCards = cardIds.map(id => cardsData.find(card => card.id === id)!).filter(Boolean);
        return sortedCards;
    } catch (err) {
        console.error(err);
        return null;
    }
}

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

  return <SupplyDisplay initialCards={initialSupply} roomId={roomId} />;
}
