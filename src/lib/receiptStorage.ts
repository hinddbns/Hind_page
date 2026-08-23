import { createClient } from "@supabase/supabase-js";

const RECEIPTS_BUCKET = "receipts";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export async function uploadReceipt(key: string, buffer: Buffer, contentType: string) {
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(key, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
}

export async function downloadReceipt(key: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteReceipt(key: string) {
  await supabase.storage.from(RECEIPTS_BUCKET).remove([key]);
}
