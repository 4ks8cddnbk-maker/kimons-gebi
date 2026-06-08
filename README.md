# Kimons 23. Geburtstag

Deutschsprachige Next.js Website für Kimons 23. Geburtstag am 27.06.2026 um 19:00 Uhr in der Wendelinstraße 94.

## Features

- Home im Apple-2010/Snow-Leopard-Stil
- RSVP-Formular mit Google-Sheets-Anbindung
- Admin Login
- Foto-Galerie mit Admin-Upload
- Speiseplan
- ASEAG Nachtbus Bereich ab Brand Steinbrück
- Interaktiver iPod Classic mit lokalem MP3-Player
- Responsive Mobile Design
- Vercel-ready

## Lokal starten

```bash
npm install
npm run dev
```

Danach öffnest du `http://localhost:3000`.

## Umgebungsvariablen

Lege lokal eine `.env.local` an oder setze die Werte in Vercel:

```bash
ADMIN_PASSWORD=dein-admin-passwort
ADMIN_SESSION_SECRET=ein-sehr-langer-zufaelliger-string
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/DEIN_SCRIPT/exec
BLOB_READ_WRITE_TOKEN=vercel_blob_token
```

Ohne `GOOGLE_SHEETS_WEBHOOK_URL` nimmt das RSVP-Formular lokal Antworten an, schreibt sie aber nicht in Google Sheets.
Ohne `BLOB_READ_WRITE_TOKEN` bleibt die Galerie leer und Uploads können nicht dauerhaft gespeichert werden.

## Google Sheets einrichten

1. Erstelle ein neues Google Sheet.
2. Lege die Kopfzeile an:
   `timestamp`, `name`, `attending`, `guests`, `food`, `message`
3. Öffne `Erweiterungen` > `Apps Script`.
4. Füge diesen Code ein:

```js
const SHEET_NAME = "Antworten";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  sheet.appendRow([
    data.timestamp,
    data.name,
    data.attending,
    data.guests,
    data.food,
    data.message
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

5. Benenne den Tabellen-Tab in `Antworten` um.
6. Klicke auf `Bereitstellen` > `Neue Bereitstellung`.
7. Typ: `Web-App`.
8. Ausführen als: `Ich`.
9. Zugriff: `Jeder`.
10. Kopiere die Web-App-URL nach `GOOGLE_SHEETS_WEBHOOK_URL`.

## Vercel Blob für Fotos

1. Öffne dein Projekt in Vercel.
2. Gehe zu `Storage`.
3. Erstelle einen `Blob` Store.
4. Verbinde ihn mit dem Projekt.
5. Vercel setzt `BLOB_READ_WRITE_TOKEN` automatisch oder bietet ihn zum Kopieren an.

## Deployment auf Vercel

1. Projekt bei GitHub hochladen.
2. In Vercel `Add New` > `Project`.
3. GitHub-Repository auswählen.
4. Framework Preset bleibt `Next.js`.
5. Unter `Environment Variables` eintragen:
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `GOOGLE_SHEETS_WEBHOOK_URL`
   - `BLOB_READ_WRITE_TOKEN`
6. `Deploy` klicken.
7. Danach im Vercel-Dashboard deine Domain öffnen.

## Admin

Der Adminbereich liegt unter `/admin`.
Das Passwort ist aktuell `louki22`, beziehungsweise der Wert aus `ADMIN_PASSWORD`.
# kimons-gebi
# kimons-gebi
