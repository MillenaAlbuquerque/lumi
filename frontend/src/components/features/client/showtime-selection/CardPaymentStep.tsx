import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react'
import { paymentService, type PaymentResult } from '../../../../services/paymentService'
import { Button } from '../../../ui/button'
import CardPayment from './MercadoPagoCardBrick'

const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_TEST as string | undefined

type CardFormData = Parameters<ComponentProps<typeof CardPayment>['onSubmit']>[0]

interface CardPaymentStepProps {
  sessionId: number
  holdId: number
  holdExpiresAt: string
  seatIds: number[]
  estimatedTotal: number
  seatLabels: string[]
  onBack: () => void
  onPaymentResult: (status: PaymentResult['reservation_status']) => void
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `lumi-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function CardPaymentStep({ sessionId, holdId, holdExpiresAt, seatIds, estimatedTotal, seatLabels, onBack, onPaymentResult }: CardPaymentStepProps) {
  const [idempotencyKey] = useState(createIdempotencyKey)
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState('')
  const brickKey = 0
  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)))
  const initialization = useMemo(() => ({ amount: estimatedTotal, payer: { email: 'test@testuser.com' } }), [estimatedTotal])
  const paymentResultCallback = useRef(onPaymentResult)

  useEffect(() => {
    paymentResultCallback.current = onPaymentResult
  }, [onPaymentResult])

  useEffect(() => {
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [holdExpiresAt])

  const submitPayment = useCallback(async (formData: CardFormData) => {
    setError('')
    const identification = formData.payer?.identification
    if (!formData.payer?.email || !identification?.type || !identification.number) {
      setError('Confira o e-mail e o documento do titular.')
      return
    }
    try {
      const payment = await paymentService.create({
        session_id: sessionId,
        hold_id: holdId,
        seat_ids: seatIds,
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        installments: formData.installments,
        payer: {
          email: formData.payer.email,
          identification_type: identification.type,
          identification_number: identification.number,
        },
      }, idempotencyKey)
      setResult(payment)
      paymentResultCallback.current(payment.reservation_status)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível processar o pagamento.')
    }
  }, [holdId, idempotencyKey, seatIds, sessionId])

  if (!publicKey) return <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100"><p className="font-semibold">Pagamento TEST não configurado</p><p className="mt-1 text-sm text-amber-100/75">Adicione <code>VITE_MERCADO_PAGO_PUBLIC_KEY_TEST</code> ao arquivo <code>frontend/.env</code> e reinicie o Vite.</p><button type="button" onClick={onBack} className="mt-4 text-sm font-semibold text-orange-400 underline">Voltar aos assentos</button></div>

  if (result) {
    const approved = result.reservation_status === 'confirmed'
    const declined = result.reservation_status === 'cancelled'
    return <div className="mx-auto max-w-xl rounded-2xl p-2 text-center text-white">
      {approved ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /> : declined ? <XCircle className="mx-auto h-12 w-12 text-red-400" /> : <Clock3 className="mx-auto h-12 w-12 text-amber-400" />}
      <h3 className="mt-4 text-xl font-semibold">{approved ? 'Pagamento confirmado!' : declined ? 'Pagamento recusado' : 'Pagamento em análise'}</h3>
      <p className="mt-2 text-sm text-white/60">{approved ? 'Sua reserva foi confirmada.' : declined ? 'A reserva foi cancelada e os assentos foram liberados.' : 'A reserva continuará pendente até a confirmação do Mercado Pago.'}</p>
      <div className="mt-6 space-y-2 rounded-xl bg-black/20 p-4 text-left text-sm">
        <p><span className="text-[var(--color-primary-dark)]">Reserva:</span> #{result.reservation_id}</p>
        <p><span className="text-[var(--color-primary-dark)]">Assentos:</span> {seatLabels.join(', ')}</p>
        <p><span className="text-[var(--color-primary-dark)]">Total confirmado :</span> <strong className="text-orange-400">R$ {Number(result.total).toFixed(2).replace('.', ',')}</strong></p>
        {result.provider_payment_id && <p><span className="text-[var(--color-primary-dark)]">Pagamento Mercado Pago:</span> {result.provider_payment_id}</p>}
      </div>
      {declined && <Button type="button" onClick={onBack} className="mt-5 w-full">Escolher assentos novamente</Button>}
      {!approved && !declined && <p className="mt-5 text-xs text-white/45">A confirmação será recebida pelo webhook. Não tente pagar novamente enquanto estiver pendente.</p>}
    </div>
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div className="min-w-0 rounded-2xl bg-[var(--color-surface)] p-3 sm:p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-3 text-[var(--color-primary-dark)]"><CreditCard className="h-5 w-5 text-orange-500" /><h3 className="font-semibold">Dados do cartão</h3></div>
      <CardPayment key={`${brickKey}-${sessionId}-${seatIds.join('-')}`} initialization={initialization} locale="pt-BR" customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 12 }, visual: { style: { theme: 'default' } } }} onSubmit={submitPayment} onError={(brickError) => setError((current) => current || `Mercado Pago Brick: ${brickError.message || 'não foi possível validar o formulário.'}`)} />
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
    <aside className="h-fit rounded-2xl  bg-white/[0.04] p-5 text-white">
      <h3 className="font-semibold text-orange-400">Resumo do pagamento</h3>
      <p className="mt-3 flex items-center gap-2 text-sm text-amber-300"><Clock3 className="h-4 w-4" />Assentos reservados por {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</p>
      <p className="mt-4 text-sm text-white/55">Assentos</p><p className="text-sm">{seatLabels.join(', ')}</p>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span>Total</span><strong className="text-lg text-orange-400">R$ {estimatedTotal.toFixed(2).replace('.', ',')}</strong></div>
      <p className="mt-2 text-xs text-white/40">Cartão processado com segurança pelo Mercado Pago em ambiente TEST.</p>
      <button type="button" onClick={onBack} className="mt-5 cursor-pointer w-full text-sm font-semibold text-orange-400 underline">Voltar aos assentos</button>
    </aside>
  </div>
}

export default CardPaymentStep
