export interface HttpClientOptions {
  baseUrl: string
}

export class HttpClient {
  private baseUrl: string

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(await response.text())
    }

    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  createEventSource(path: string): EventSource {
    return new EventSource(`${this.baseUrl}${path}`)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}
