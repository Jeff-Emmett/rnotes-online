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

    // Forward to voice-command API diarization endpoint
    const proxyForm = new FormData();
    proxyForm.append('audio', audio, audio.name || 'recording.webm');

    const res = await fetch(`${VOICE_API_URL}/api/voice/diarize`, {
      method: 'POST',
      body: proxyForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Diarization API error:', res.status, err);
      return NextResponse.json(
        { error: 'Diarization failed' },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Diarize proxy error:', error);
    return NextResponse.json({ error: 'Diarization failed' }, { status: 500 });
  }
}
