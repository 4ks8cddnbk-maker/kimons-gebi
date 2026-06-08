import { NextResponse } from "next/server";

type RsvpPayload = {
  name?: string;
  attending?: string;
  guests?: string;
  food?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as RsvpPayload;

  if (!payload.name || !payload.attending) {
    return NextResponse.json({ ok: false, message: "Name und Zusage sind Pflicht." }, { status: 400 });
  }

  const row = {
    timestamp: new Date().toISOString(),
    name: payload.name,
    attending: payload.attending,
    guests: payload.guests || "0",
    food: payload.food || "",
    message: payload.message || ""
  };

  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhook) {
    console.info("RSVP received without GOOGLE_SHEETS_WEBHOOK_URL:", row);
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "RSVP gespeichert. Google Sheets Webhook ist lokal noch nicht gesetzt."
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

  return NextResponse.json({ ok: true, message: "Danke, deine RSVP ist angekommen." });
}
