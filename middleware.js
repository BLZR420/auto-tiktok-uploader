import { NextResponse } from "next/server";

export function middleware(req) {
  const url = new URL(req.url);
  const p = url.pathname;

  // Lass API-Endpunkte, statische Dateien und TikTok-Verifizierungsdateien in Ruhe
  if (p.startsWith("/api")) return NextResponse.next();
  if (p.includes(".")) return NextResponse.next(); // .html, .css, .js, .txt usw.

  // Alles andere leite zur Startseite weiter (Single-Page-Fallback)
  return NextResponse.rewrite(new URL("/", req.url));
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
