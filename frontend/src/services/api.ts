const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const api = {
  baseURL: API_BASE_URL,
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }
    return response.json()
  },
}

export default api
