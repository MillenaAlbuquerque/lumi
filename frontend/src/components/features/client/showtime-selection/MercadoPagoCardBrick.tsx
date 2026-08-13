import { loadMercadoPago } from '@mercadopago/sdk-js'
import { useEffect, useId, useRef } from 'react'

interface CardBrickController {
  unmount: () => void | Promise<void>
}

interface MercadoPagoInstance {
  bricks: () => {
    create: (
      name: 'cardPayment',
      containerId: string,
      settings: Record<string, unknown>,
    ) => Promise<CardBrickController>
  }
}

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string; frontEndStack?: string },
) => MercadoPagoInstance

export interface MercadoPagoCardBrickProps {
  initialization: Record<string, unknown>
  customization?: Record<string, unknown>
  locale?: string
  onSubmit: (formData: any) => void | Promise<void>
  onError?: (error: Error) => void
}

function MercadoPagoCardBrick({ initialization, customization, locale = 'pt-BR', onSubmit, onError }: MercadoPagoCardBrickProps) {
  const reactId = useId()
  const containerId = `lumi-card-payment-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const callbacks = useRef({ onSubmit, onError })
  const settings = useRef({ initialization, customization, locale })

  useEffect(() => {
    callbacks.current = { onSubmit, onError }
  }, [onSubmit, onError])

  useEffect(() => {
    let cancelled = false
    let controller: CardBrickController | null = null

    const mountBrick = async () => {
      try {
        await loadMercadoPago()
        if (cancelled) return
        const MercadoPago = (window as unknown as { MercadoPago?: MercadoPagoConstructor }).MercadoPago
        const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY_TEST as string | undefined
        if (!MercadoPago || !publicKey) throw new Error('Mercado Pago TEST não está configurado.')

        const instance = new MercadoPago(publicKey, { locale: settings.current.locale, frontEndStack: 'react' })
        controller = await instance.bricks().create('cardPayment', containerId, {
          initialization: settings.current.initialization,
          customization: settings.current.customization,
          callbacks: {
            onReady: () => undefined,
            onSubmit: (formData: unknown) => callbacks.current.onSubmit(formData),
            onError: (error: Error) => callbacks.current.onError?.(error),
          },
          locale: settings.current.locale,
        })
        if (cancelled) await controller.unmount()
      } catch (error) {
        if (!cancelled) callbacks.current.onError?.(error instanceof Error ? error : new Error('Não foi possível carregar o pagamento.'))
      }
    }

    void mountBrick()
    return () => {
      cancelled = true
      if (controller) void controller.unmount()
    }
  }, [containerId])

  return <div id={containerId} />
}

export default MercadoPagoCardBrick
