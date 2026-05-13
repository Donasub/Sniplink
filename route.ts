import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function genCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

function isValidURL(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  let url: string = (body.url ?? '').trim()

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Auto-prepend https:// if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  if (!isValidURL(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Check if this exact URL was already shortened
  const { data: existing } = await supabase
    .from('links')
    .select('code')
    .eq('long_url', url)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ code: existing.code, reused: true })
  }

  // Generate a unique code (retry on collision)
  let code = genCode()
  let attempts = 0

  while (attempts < 5) {
    const { data: collision } = await supabase
      .from('links')
      .select('code')
      .eq('code', code)
      .maybeSingle()

    if (!collision) break
    code = genCode()
    attempts++
  }

  const { error } = await supabase
    .from('links')
    .insert({ code, long_url: url })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code, reused: false })
}
