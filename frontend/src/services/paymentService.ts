import { authService } from './authService'

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const API_BASE_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`

export interface PaymentRequest {
  session_id: number
  hold_id?: number
  seat_ids: number[]
  token: string
  payment_method_id: string
  installments: number
  payer: { email: string; identification_type: string; identification_number: string }
}

export interface PaymentResult {
  id: number
  reservation_id: number
  session_id: number
  payment_status: string
  status_detail: string | null
  reservation_status: 'pending' | 'confirmed' | 'cancelled'
  provider_order_id: string | null
  provider_payment_id: string | null
  unit_price: number
  total: number
  seats: Array<{ id: number; row: string; number: number; price: number }>
  created_at: string
}

export class PaymentRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PaymentRequestError'
    this.status = status
  }
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => null)
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ')
  return 'Não foi possível processar o pagamento.'
}

export const paymentService = {
  async create(payload: PaymentRequest, idempotencyKey: string): Promise<PaymentResult> {
    const token = authService.getToken()
    if (!token) throw new PaymentRequestError('Faça login para continuar.', 401)
    const response = await fetch(`${API_BASE_URL}/client/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new PaymentRequestError(await parseError(response), response.status)
    return response.json()
  },

  async get(paymentId: number): Promise<PaymentResult> {
    const token = authService.getToken()
    if (!token) throw new PaymentRequestError('Faça login para continuar.', 401)
    const response = await fetch(`${API_BASE_URL}/client/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new PaymentRequestError(await parseError(response), response.status)
    return response.json()
  },
}
