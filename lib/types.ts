export interface Palazzo {
  id: string
  name: string
  description: string | null
  address: string | null
  created_at: string
  updated_at: string
  vetrate_count?: number
}

export interface Vetrata {
  id: string
  palazzo_id: string
  name: string
  description: string | null
  image_url: string
  created_at: string
}
