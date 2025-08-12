import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const extension = file.name.split('.').pop()
  const filename = `${uuidv4()}.${extension}`
  const path = `${folder}/${filename}`

  const { error } = await supabase.storage
    .from('restaurant-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Erro ao fazer upload:', error.message)
    return null
  }

  const { data: publicUrlData } = supabase.storage
    .from('restaurant-images')
    .getPublicUrl(path)

  return publicUrlData?.publicUrl ?? null
}
