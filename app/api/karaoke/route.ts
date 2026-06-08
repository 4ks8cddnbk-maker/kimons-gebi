import { NextResponse } from "next/server";

type KaraokePayload = {
  name?: string;
  song?: string;
  partners?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as KaraokePayload;

  if (!payload.name || !payload.song || !payload.partners) {
    return NextResponse.json({ ok: false, message: "Name, Song und Mit wem sind Pflicht." }, { status: 400 });
  }

  const row = {
    timestamp: new Date().toISOString(),
    name: payload.name,
    song: payload.song,
    partners: payload.partners,
    notes: payload.notes || ""
  };

  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhook) {
    console.info("Karaoke signup received without GOOGLE_SHEETS_WEBHOOK_URL:", row);
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Karaoke-Anmeldung gespeichert. Google Sheets Webhook ist lokal noch nicht gesetzt."
    });
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false, message: "Google Sheets konnte nicht erreicht werden." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Danke, dein Karaoke-Song ist eingetragen." });
}
