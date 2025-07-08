import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url: supplyUrl } = await request.json();

    if (!supplyUrl) {
      return NextResponse.json({ message: 'URL is required' }, { status: 400 });
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      console.error('DISCORD_WEBHOOK_URL is not set in environment variables.');
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    // ★★★ メッセージの形式を修正 ★★★
    const payload = {
      content: `**新しいサプライが生成されました：**\n${supplyUrl}`,
    };

    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed with status: ${response.status}`);
      return NextResponse.json({ message: 'Failed to post to Discord' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Successfully posted to Discord' });
  } catch (error) {
    console.error('Error in Discord API route:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}