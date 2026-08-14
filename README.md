# Lumi

> **Aplicação publicada:** [Lumi(https://lumi-front-924b.onrender.com/)]

## Visão geral

Plataforma web para operação e venda de ingressos de cinema. O sistema reúne catálogo de filmes, sessões, salas e assentos, pagamento em ambiente de testes, emissão de ingressos com QR Code e validação na portaria.

A aplicação possui três perfis com áreas e permissões próprias: `CLIENT`, `ORGANIZER` e `GATEKEEPER`.

## Funcionalidades

### Cliente (`CLIENT`)

- Cadastro e login.
- Consulta de filmes com sessões futuras, com busca e filtro por data.
- Consulta de cinemas e dos filmes disponíveis em cada unidade.
- Seleção de cinema, sessão e um ou mais assentos reais da sala.
- Atualização da disponibilidade dos assentos por WebSocket.
- Bloqueio temporário dos assentos antes do pagamento.
- Pagamento com cartão pelo Mercado Pago em ambiente `TEST`.
- Listagem de ingressos emitidos, com QR Code e código curto para digitação manual.
- Compartilhamento de ingresso por link temporário.
- Cancelamento de ingresso até uma hora antes da sessão.

### Organizador (`ORGANIZER`)

- Cadastro de organizador junto ao seu cinema.
- Isolamento dos dados pelo cinema associado ao usuário autenticado.
- Dashboard com ingressos vendidos, receita total e sessões com vendas, agrupadas por sala e filme.
- Cadastro, listagem e exclusão de salas com geração dos respectivos assentos.
- Criação e consulta de sessões com sala, filme, data, horário, preço e projeção 2D ou 3D.
- Pesquisa de filmes no TMDB e inclusão no catálogo global do Lumi.
- Cadastro, edição e exclusão de funcionários da portaria.
- Consulta e edição do nome e endereço do cinema, com busca de endereço por CEP.

### Portaria (`GATEKEEPER`)

- Área protegida e vinculada ao cinema em que o funcionário trabalha.
- Leitura do QR Code pela câmera do dispositivo.
- Validação por código curto digitado manualmente.
- Validação do ingresso exclusivamente no backend.
- Identificação de ingresso válido, inválido ou já utilizado.
- Atualização atômica de `issued` para `used`, com registro de data, hora e funcionário responsável.
- Rejeição de ingressos que não pertencem ao cinema do funcionário.

## Stack

### Frontend

- React 19 e TypeScript
- Vite 8
- Tailwind CSS 4
- React Router
- Radix UI para tabs, popovers e alert dialogs
- Mercado Pago React SDK — Card Payment Brick
- Embla Carousel
- React Day Picker e date-fns
- `@yudiel/react-qr-scanner` para leitura de QR Code
- `qrcode.react` para geração dos QR Codes
- Lucide React

### Backend

- Python 3.13
- FastAPI e Uvicorn
- SQLAlchemy 2 com acesso assíncrono
- PostgreSQL com Psycopg 3
- Alembic
- Pydantic Settings
- JWT com `python-jose`
- Hash de senhas com bcrypt/passlib
- HTTPX para integrações externas
- Pytest e pytest-asyncio

## Arquitetura

```text
React + Vite
    ├── HTTP/JSON + WebSocket ──► FastAPI ──► PostgreSQL
    │                                  ├────► Mercado Pago TEST
    │                                  └────► TMDB
    └── HTTPS ────────────────────────► ViaCEP
```

O domínio principal segue a relação:

```text
User (ORGANIZER) → Cinema → Room → Seat
                              └── Event/Session → Movie

User (CLIENT) → Reservation → ReservationSeat → Ticket
                           └── Payment
```

No código e no banco, uma sessão de cinema é representada pelo model `Event`.

## Autenticação e autorização

O backend emite um JWT após o login. As senhas são armazenadas somente como hash bcrypt, e as rotas protegidas recuperam o usuário a partir do token Bearer.

As permissões são verificadas no backend por dependências específicas para `CLIENT`, `ORGANIZER` e `GATEKEEPER`. O frontend também protege as páginas por perfil e redireciona usuários sem autenticação para o login.

O organizer não informa IDs de propriedade para administrar outro cinema: salas, sessões, equipe e dashboard são resolvidos a partir do cinema associado ao usuário autenticado. O gatekeeper também é limitado aos ingressos do cinema ao qual está vinculado.

## Mercado Pago

O pagamento utiliza o **Card Payment Brick** no frontend e a **Orders API** do Mercado Pago no backend, exclusivamente no ambiente `TEST`.

- A Public Key TEST é usada no frontend.
- O Access Token TEST permanece somente no backend.
- O preço total é calculado pelo backend com base na sessão e nos assentos.
- A requisição de pagamento exige `X-Idempotency-Key`.
- Sessão, pertencimento e disponibilidade dos assentos são revalidados com bloqueios no banco.
- Pagamentos aprovados confirmam a reserva e emitem os ingressos.
- Pagamentos recusados cancelam a reserva e liberam os assentos.
- Estados pendentes permanecem pendentes até reconciliação.
- O webhook aceita apenas notificações de Order em modo de teste, valida a assinatura e consulta a Order no Mercado Pago antes de atualizar o pagamento.

Use somente contas, credenciais e cartões de teste oficiais do Mercado Pago.

### Testar pagamentos

Entre no Lumi com uma conta `CLIENT`, selecione uma sessão e os assentos e avance até o Card Payment Brick. No formulário do Mercado Pago, esteja logado com um e-mail de final `@testuser.com` e um dos cartões oficiais abaixo:

| Bandeira | Número | CVV | Validade |
| --- | --- | --- | --- |
| Mastercard | `5480 8328 0103 3311` | `123` | `11/30` |
| Visa | `4235 6477 2802 5682` | `123` | `11/30` |
| American Express | `3753 651535 56885` | `1234` | `11/30` |

O resultado é definido pelo nome do titular informado no Brick:

| Cenário | Nome do titular | Documento |
| --- | --- | --- |
| Pagamento aprovado | `APRO` | CPF `12345678909` |
| Pagamento recusado | `OTHE` | CPF `12345678909` |

Qualquer um dos cartões acima pode ser combinado com `APRO` ou `OTHE`. Em caso de aprovação, a reserva é confirmada e os ingressos são emitidos. Em caso de recusa, a reserva é cancelada e os assentos voltam a ficar disponíveis.

Consulte a [documentação oficial de cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards). Nunca utilize um cartão real neste ambiente.

## TMDB e CEP

O organizer pode pesquisar filmes no TMDB e adicioná-los ao catálogo global. A integração solicita título e descrição em português (`pt-BR`) e impede duplicação pelo `tmdb_id`.

O cadastro e as configurações do cinema consultam o [ViaCEP](https://viacep.com.br/) no frontend para montar o endereço a partir do CEP e número.

## Execução local

### Pré-requisitos

- Python 3.13
- Node.js e npm
- PostgreSQL em execução

### Banco de dados

O Lumi utiliza dois bancos locais:

| Banco | Uso |
| --- | --- |
| `lumi` | Aplicação, migrations e seed de demonstração |
| `lumi_test` | Execução isolada dos testes do backend |

Primeiro, copie o arquivo de exemplo:

```powershell
cd backend
Copy-Item .env.example .env
```

Edite `backend/.env` com as credenciais do seu PostgreSQL local:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha-local
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=lumi
```

Não é necessário definir `DATABASE_URL` no ambiente local quando as variáveis `POSTGRES_*` estiverem configuradas.

Crie o banco principal usando o terminal do PostgreSQL:

```powershell
psql -U postgres -d postgres
```

Dentro do `psql`, execute:

```sql
CREATE DATABASE lumi;
```

Encerre o `psql` com `\q`. Se o seu usuário ou nome de banco forem diferentes, use os mesmos valores configurados no `.env`.

O Pytest tenta criar automaticamente o banco `lumi_test` na primeira execução. Para isso, o usuário configurado em `POSTGRES_USER` precisa ter permissão `CREATEDB`. Se ele não tiver essa permissão, crie o banco de testes manualmente com um usuário administrador:

```sql
CREATE DATABASE lumi_test;
```

O banco de testes é derivado de `POSTGRES_DB` acrescentando o sufixo `_test`. Por exemplo, `POSTGRES_DB=lumi` resulta em `lumi_test`. Não aponte essas variáveis para um banco de produção ao executar os testes.

As migrations do Alembic são responsáveis por criar e evoluir o schema; não crie as tabelas manualmente. As tabelas centrais são:

| Tabela | Responsabilidade |
| --- | --- |
| `users` | Usuários e seus perfis de acesso |
| `cinemas` | Cinema pertencente a um organizer |
| `cinema_gatekeepers` | Vínculo dos funcionários com o cinema |
| `rooms` | Salas pertencentes a um cinema |
| `seats` | Assentos e tipos configurados por sala |
| `movies` | Catálogo global de filmes |
| `events` | Sessões, filme, sala, horário, projeção e preço |
| `reservations` | Reserva do cliente e seu estado |
| `reservation_seats` | Assentos e preços associados à reserva |
| `payments` | Identificadores, valor e estado do pagamento |
| `tickets` | Ingressos, hashes dos tokens e dados de utilização |

### Backend

Com o banco e o `.env` preparados:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
python -m app.seed_demo
uvicorn app.main:app --reload
```

`alembic upgrade head` cria toda a estrutura de tabelas no banco `lumi`. O seed é opcional, mas recomendado para testar os fluxos com dados prontos.

A API fica disponível em `http://localhost:8000`. A documentação OpenAPI pode ser acessada em `http://localhost:8000/docs`.

Para conferir a conexão com o banco, acesse:

```text
http://localhost:8000/api/health/db
```

Uma conexão válida retorna:

```json
{"database": "connected"}
```

Para conferir a migration aplicada:

```powershell
alembic current
```

Para instalar também as dependências de testes:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```

Os testes criam as tabelas no banco com sufixo `_test`, executam cada cenário isoladamente e removem as tabelas ao final. O banco principal `lumi` não é utilizado por eles.

### Frontend

Na raiz do repositório:

```powershell
npm ci
Copy-Item frontend/.env.example frontend/.env
npm run dev:frontend
```

O frontend fica disponível normalmente em `http://localhost:5173`.

## Variáveis de ambiente

### Backend — `backend/.env`

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | URL completa do PostgreSQL; usada principalmente no deploy |
| `POSTGRES_USER` | Usuário do PostgreSQL local |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL local |
| `POSTGRES_HOST` | Host do PostgreSQL local |
| `POSTGRES_PORT` | Porta do PostgreSQL local |
| `POSTGRES_DB` | Nome do banco principal |
| `JWT_SECRET_KEY` | Chave de assinatura dos JWTs e tokens internos |
| `JWT_ALGORITHM` | Algoritmo do JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tempo de expiração do token de acesso |
| `TMDB_API_KEY` | Chave da API do TMDB |
| `MERCADO_PAGO_ENVIRONMENT` | Deve permanecer como `test` nesta implementação |
| `MERCADO_PAGO_ACCESS_TOKEN_TEST` | Access Token TEST do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Opcional localmente; segredo para validar notificações caso o webhook seja utilizado |
| `MERCADO_PAGO_API_URL` | URL base da API do Mercado Pago |
| `FRONTEND_URL` | Origem autorizada no CORS e base dos links compartilhados |

Quando `DATABASE_URL` não é informada, o backend monta a conexão usando as variáveis `POSTGRES_*`.

### Frontend — `frontend/.env`

| Variável | Finalidade |
| --- | --- |
| `VITE_API_URL` | URL pública da API, com ou sem o sufixo `/api` |
| `VITE_MERCADO_PAGO_PUBLIC_KEY_TEST` | Public Key TEST usada pelo Card Payment Brick |

Variáveis `VITE_*` são incorporadas durante o build; qualquer alteração exige gerar um novo build do frontend.

## Migrations e seed

Com o ambiente do backend ativado:

```powershell
cd backend
alembic upgrade head
python -m app.seed_demo
```

O seed é idempotente e, em um banco vazio, cria:

- 5 usuários de demonstração;
- 2 cinemas;
- 4 salas com 255 assentos;
- 6 filmes;
- 18 sessões em outubro de 2026;
- nenhuma reserva, pagamento ou ingresso artificial.

Executá-lo novamente atualiza os dados de demonstração sem duplicá-los.

### Contas de demonstração

Todas as contas abaixo utilizam a senha `LumiDemo123!`.

| Perfil | E-mail | Acesso |
| --- | --- | --- |
| ORGANIZER | `organizador.paulista@lumi.demo` | Cine Paulista |
| ORGANIZER | `organizador.guarulhos@lumi.demo` | Cine Guraulhos |
| GATEKEEPER | `portaria.paulista@lumi.demo` | Portaria do Cine Paulista |
| CLIENT | `cliente.teste2@testuser.com` | Fluxo de compra |
| CLIENT | `cliente.teste@testuser.com` | Fluxo de compra |

Os clientes usam e-mails terminados em `@testuser.com` para o fluxo com usuários de teste do Mercado Pago. O seed não contém tokens, chaves ou credenciais externas reais.
