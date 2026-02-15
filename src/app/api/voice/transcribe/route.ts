import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthed } from '@/lib/auth';

const VOICE_API_URL = process.env.VOICE_API_URL || 'http://voice-command-api:8000';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;

    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Forward to voice-command API
    const proxyForm = new FormData();
    proxyForm.append('audio', audio, audio.name || 'recording.webm');

    const res = await fetch(`${VOICE_API_URL}/api/voice/transcribe`, {
      method: 'POST',
      body: proxyForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Voice API error:', res.status, err);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcribe proxy error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
