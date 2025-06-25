// --- FILE: app/[roomId]/page.tsx (型インポートのエラーを修正) ---

import { createClient } from '@supabase/supabase-js';
// ★★★ ここからが修正箇所 ★★★
import { Card } from '../../types';
import type { Database } from '../../types/supabase'; // Database型を正しいファイルからインポート
// ★★★ ここまでが修正箇所 ★★★
import Link from 'next/link';
import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const SupplyDisplay = dynamicImport(() => import('./SupplyDisplay'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: { roomId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `サプライ: ${params.roomId.substring(0, 8)}...`,
    description: '生成されたドミニオンのサプライです。',
  };
}

async function getSupply(roomId: string): Promise<Card[] | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  try {
    const { data: roomData, error: roomError } = await supabase.from('rooms').select('cards').eq('id', roomId).single();
    if (roomError || !roomData) return null;

    const cardIds = roomData.cards as string[];
    if (!Array.isArray(cardIds) || cardIds.length === 0) return null;
    
    const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*').in('id', cardIds);
    if (cardsError) return null;

    const sortedCards = cardIds.map(id => cardsData?.find(card => card.id === id)!).filter(Boolean);
    return sortedCards;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function RoomPage({ params }: PageProps) {
  const initialSupply = await getSupply(params.roomId);

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

  return <SupplyDisplay initialCards={initialSupply} roomId={params.roomId} />;
}