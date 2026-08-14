# Lumi

Plataforma de cinema com catálogo, sessões, mapa de assentos, pagamento Mercado Pago TEST, ingressos com QR Code, área do organizador e validação pela portaria.

## Preparação do banco

Com o PostgreSQL configurado em `backend/.env`, aplique as migrations:

```powershell
cd backend
.\.venv\Scripts\alembic.exe upgrade head
```

## Seed de demonstração

O seed é idempotente: pode ser executado novamente sem duplicar usuários, cinemas, salas, assentos, filmes ou sessões.

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.seed_demo
```

Ele cria dois cinemas completos, quatro salas com assentos, seis filmes e várias sessões futuras, sem criar reservas, pagamentos ou ingressos artificiais.

### Credenciais

Todas as contas usam a senha:

```text
LumiDemo123!
```

| Perfil | E-mail | Cinema/acesso |
| --- | --- | --- |
| Organizer | `organizador.paulista@lumi.demo` | Cine Paulista |
| Organizer | `organizador.guarulhos@lumi.demo` | Cine Guraulhos |
| Gatekeeper | `portaria.paulista@lumi.demo` | Portaria do Cine Paulista |
| Client | `cliente.teste2@testuser.com` | Fluxo de compra |
| Client | `cliente.teste@testuser.com` | Fluxo de compra |

Os clientes usam e-mails terminados em `@testuser.com` para manter o fluxo compatível com usuários e cartões oficiais do ambiente Mercado Pago TEST. Nenhuma credencial real ou token do Mercado Pago é inserido pelo seed.

## Executar a aplicação

Backend:

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm.cmd run dev
```

A aplicação fica normalmente disponível em `http://localhost:5173`, com a API em `http://localhost:8000`.

## Testar os fluxos

### Cliente e pagamento

1. Entre com uma das contas `@testuser.com`.
2. Escolha um filme na Home ou na página de cinemas.
3. Selecione cinema, sessão e assentos disponíveis.
4. Use exclusivamente credenciais TEST no Card Payment Brick e cartões de teste oficiais do Mercado Pago.
5. Após aprovação, confira o ingresso em **Meus ingressos**.

O Access Token do Mercado Pago deve existir somente em `backend/.env`; a Public Key TEST fica no `frontend/.env`. O seed não configura essas variáveis.

### Organizador

Entre com um dos organizers para administrar as salas, equipe, catálogo e sessões do cinema correspondente. Os cinemas possuem dados separados para permitir validar o isolamento das permissões.

### Portaria

1. Conclua uma compra como cliente.
2. Entre como `portaria.paulista@lumi.demo`.
3. Leia o QR Code ou digite o código curto do ingresso.

O porteiro está vinculado somente ao Cine Paulista. Ingressos do outro cinema são recusados sem exposição de dados, e uma validação bem-sucedida registra horário e porteiro responsável.
