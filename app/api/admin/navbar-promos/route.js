import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ error: 'navbar-promos has been replaced by navbar-image-categories' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ error: 'navbar-promos has been replaced by navbar-image-categories' }, { status: 404 });
}
