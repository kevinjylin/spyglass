import { createClient } from "@supabase/supabase-js"

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = URL_ && ANON ? createClient(URL_, ANON) : null
