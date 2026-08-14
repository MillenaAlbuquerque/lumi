export interface CepAddress {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
}

interface ViaCepResponse extends CepAddress {
  erro?: boolean | 'true'
}

export const cepService = {
  async find(cep: string, signal?: AbortSignal): Promise<CepAddress> {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.')

    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal })
    if (!response.ok) throw new Error('Não foi possível consultar o CEP agora.')

    const data = await response.json() as ViaCepResponse
    if (data.erro === true || data.erro === 'true') throw new Error('CEP não encontrado.')
    return data
  },
}

