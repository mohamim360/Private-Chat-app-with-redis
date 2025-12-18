import { treaty } from '@elysiajs/eden'
import type { App } from '../app/api/[[...slugs]]/route'

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined')
}

export const client = treaty<App>(API_URL).api
