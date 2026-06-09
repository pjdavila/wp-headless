import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, must-revalidate"
  );
  return response;
}

export const config = {
  matcher: ["/"],
};
