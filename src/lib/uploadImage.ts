import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function uploadImage(file: File) {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("products").upload(fileName, file);

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}
