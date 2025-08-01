/**
 * API client utility for making requests with proper headers for ngrok
 */

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

export const apiClient = {
  async fetch(url: string, options: FetchOptions = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    return fetch(url, mergedOptions)
  },

  async get(url: string, headers?: Record<string, string>) {
    return this.fetch(url, { method: 'GET', headers })
  },

  async post(url: string, body?: any, headers?: Record<string, string>) {
    return this.fetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    })
  },

  async put(url: string, body?: any, headers?: Record<string, string>) {
    return this.fetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    })
  },

  async delete(url: string, headers?: Record<string, string>) {
    return this.fetch(url, { method: 'DELETE', headers })
  },
}