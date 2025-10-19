import { NextResponse } from "next/server";

export function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API-Routen und statische Dateien (HTML, CSS, JS, TXT usw.) unberührt lassen
  if (
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Alle anderen Pfade auf die Hauptseite umleiten
  return NextResponse.rewrite(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
