import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qspnraniadsleifzyfxb.supabase.co";
const supabaseKey = "sb_publishable_IBioQr1MCp8OhlNPC2b-Yg_FFG5rODt";

export const supabase = createClient(supabaseUrl, supabaseKey);
