# Login DBTV

App web (mobile-first) para técnicos consultarem login e senha do app de TV.

Fluxo: escolher tipo de pesquisa (nome / ID / login) → digitar → ver login e senha.

## Rodar localmente

```bash
python -m http.server 8080
```

Abra http://localhost:8080. Para testar no celular, use o IP da máquina na mesma rede.

## Backend (webhook n8n)

Edite `config.js` com a Production URL do webhook.

**Webhook node:** método `POST`, Respond = "Using 'Respond to Webhook' Node".

**Requisição**

```json
{ "tipo": "nome" | "id" | "login", "valor": "texto digitado" }
```

Header opcional `X-Token` (configurado em `config.js`) para você validar no n8n.

**Resposta** (lista vazia = nenhum cliente; busca por nome pode retornar vários)

```json
{ "resultados": [ { "id": 123, "nome": "Fulano", "login": "fulano", "senha": "abc123" } ] }
```

**Busca por nome:** o app espera a lista de clientes (formato `[{ "resultado": [ { cliente_id, ativo, nome, cpf, enderecos: [...] } ] }]`),
mostra os clientes para o técnico escolher e, ao tocar em um, faz uma nova requisição `{ "tipo": "id", "valor": "<cliente_id>" }`,
que deve devolver o login e a senha no formato acima.

**CORS:** no Webhook node, em Options → Allowed Origins (CORS), coloque o domínio onde o app for hospedado
(ou `*` só para testes).

## Segurança

Este app expõe senhas. Antes de usar em produção:

- Valide o `X-Token` (ou algo melhor, como login por técnico) no n8n; um token em `config.js` fica visível para quem abrir o site.
- Hospede com HTTPS e, se possível, restrinja por IP/VPN ou Basic Auth no servidor.
- Registre no n8n quem consultou o quê.
