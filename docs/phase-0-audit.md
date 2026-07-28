# Fase 0 — auditoria da fundação de comércio

Data da auditoria: 28 de julho de 2026

## Resumo executivo

O Wishly já tem uma fundação funcional para listas, autofill, afiliados e um
primeiro modelo de radar. Entretanto, o conceito de “desejo na lista”, produto,
oferta e observação de preço está concentrado principalmente em `public.gifts`.

A evolução mais segura é incremental:

1. manter `gifts` como o item legado da lista;
2. criar `products`, `retailers`, `product_offers` e `price_observations`;
3. adicionar referências opcionais em `gifts`;
4. manter todas as colunas legadas durante a transição;
5. fazer a escrita técnica somente por um pipeline backend autenticado;
6. ativar o novo caminho por feature flag;
7. migrar dados históricos por backfill idempotente e retomável.

Não há incompatibilidade que impeça a Fase 0, mas há drift entre migrations
locais e o banco de produção. Nenhuma migration nova deve ser aplicada antes de
validar esse drift e testar em um ambiente isolado.

## Stack atual

### Frontend

- React 19 com TypeScript estrito.
- Vite 7 como bundler e servidor de desenvolvimento.
- CSS global em `src/styles.css`.
- Ícones por `lucide-react`.
- Aplicação concentrada em `src/App.tsx`; não há roteador externo.
- Cliente Supabase singleton em `src/lib/supabase.ts`.
- Camada de acesso a dados em `src/lib/wishly-api.ts`.
- Deploy do frontend por AWS Amplify a partir de `main`.

### Backend

- Supabase Auth, Postgres, Storage, Data API e Edge Functions.
- Edge Function `extract-product` contém o autofill e providers.
- Edge Functions adicionais para OAuth e notificações do Mercado Livre.
- Não há servidor Node próprio.
- Parte relevante da lógica de negócio ainda roda no navegador e escreve
  diretamente em tabelas expostas pela Data API.

### Testes e tooling

- `node:test` com `--experimental-strip-types`.
- Testes unitários em `src/lib/*.test.mjs`.
- Testes de providers em `supabase/functions/extract-product/tests`.
- Fixtures sanitizadas existem para Mercado Livre e dados estruturados.
- Scripts disponíveis: `dev`, `build`, `preview`, `test` e
  `test:extract-product`.
- Não há script de lint configurado.
- Não há framework de testes de integração com banco.

## Configuração do Supabase

Projeto de produção identificado pelo ref `nadhhfzzcfzxrdlovcwf`.

Edge Functions ativas durante a auditoria:

| Função | Versão | JWT |
| --- | ---: | --- |
| `extract-product` | 21 | obrigatório |
| `meli-oauth-start` | 2 | obrigatório |
| `meli-oauth-callback` | 5 | validação própria |
| `meli-notifications` | 2 | validação própria |

O frontend expõe apenas URL e chave pública/anon via variáveis `VITE_*`. Não foi
encontrado `service_role` no frontend.

### Drift de migrations

O histórico de produção não corresponde integralmente aos nomes e timestamps
dos arquivos locais. Exemplos:

- produção registra `20260721122344 product_autofill`, enquanto o arquivo local
  é `20260720164000_product_autofill.sql`;
- produção contém `20260617234726 soft_delete_gifts`, sem arquivo equivalente
  visível no repositório;
- o banco contém `price_history` e `price_alerts`, mas não há migration local de
  criação dessas tabelas;
- várias migrations locais de julho não aparecem com os mesmos nomes/versões
  no histórico remoto.

Consequência: migrations novas devem ser estritamente aditivas e não devem
assumir que o replay integral da pasta local reproduz produção.

## Modelo de dados atual

### Núcleo de listas

- `profiles`: perfil vinculado a `auth.users`.
- `wishlists`: lista, proprietário, compartilhamento, tema e opções de evento.
- `gifts`: item de lista e, atualmente, também produto, oferta, preço e estado
  de extração.
- `gift_reservations`: reserva pública de item.
- `gift_contributions`: contribuição coletiva.

`gifts` tem `wishlist_id` obrigatório e `ON DELETE CASCADE` a partir da lista.
Esse comportamento legado será preservado. As novas referências técnicas serão
opcionais e usarão `ON DELETE SET NULL` quando ligadas ao item.

### Autofill atual

`gifts` armazena diretamente:

- `store_url` e `canonical_url`;
- provider, loja, vendedor e IDs externos;
- imagem principal e lista de imagens;
- preço estimado, atual e anterior;
- disponibilidade e variante;
- confiança, warnings e estado do autofill.

`product_extractions` registra tentativas e payloads de extração, ligadas ao
`gift_id`. Em produção existem 42 extrações para 19 itens.

### Radar atual

- `price_history` está ligado diretamente a `gifts.item_id`.
- `price_alerts` também aponta para o item.
- `gifts` contém agregados como menor, maior e média de preço.
- Durante a auditoria, `price_history` tinha zero registros.

Esse histórico não representa uma oferta específica e, portanto, não deve ser
renomeado ou reaproveitado silenciosamente. O novo
`price_observations.offer_id` coexistirá com ele.

### Afiliados

- `affiliate_merchants` representa lojistas e estratégia de afiliação.
- `affiliate_links` possui URL original e afiliada por `gift`.
- um trigger sincroniza o link afiliado quando `gifts.store_url` muda;
- `resolve_public_gift_redirect` escolhe o destino e registra o clique.

Há 16 links afiliados em produção. O novo `product_offers.affiliate_url` deve
coexistir com esse sistema; o resolvedor de compra deve aceitar ambos durante a
transição.

## Fluxo atual de criação de lista

1. A interface obtém o usuário autenticado.
2. Busca o `profile`.
3. Opcionalmente envia a capa ao bucket de Storage.
4. Insere diretamente em `wishlists`.
5. A RLS `wishlists_owner_all` valida o proprietário.
6. Em caso de falha após upload, tenta remover a imagem enviada.

A lista pode existir sem capa; a interface gera uma apresentação visual de
fallback.

## Fluxo atual de adição de produto

1. A tela pede a lista de destino.
2. O navegador chama `extract-product` por `supabase.functions.invoke`.
3. A Edge Function valida a sessão, valida a URL e executa providers.
4. O resultado volta ao navegador para revisão e fallback manual.
5. O navegador chama `createGift`.
6. `createGift` insere diretamente em `gifts`.
7. Em seguida, tenta inserir `product_extractions`.
8. Trigger legado pode criar/atualizar `affiliate_links`.
9. A interface recarrega a lista.

O fluxo é parcialmente idempotente apenas na interface:
`WishSubmissionLock` bloqueia repetição por cinco segundos, mas não protege
retries de rede, múltiplas abas ou reexecução no backend.

## Normalização e marketplaces

O provider do Mercado Livre possui tratamento especializado. Shopify, JSON-LD,
Open Graph e fallback genérico são tratados no `extract-product`. A
normalização e extração estão acopladas à Edge Function; não há um contrato
separado e testável que produza `canonicalUrl`, parâmetros removidos,
identificadores e confiança sem rede.

O modelo atual usa `provider` tanto para varejista (`mercado_livre`) quanto para
método (`structured_data`, `open_graph`, `generic`). Esses conceitos precisam
ser separados em `retailer` e `extraction_method`.

## URLs, preços e imagens

- URL digitada: `gifts.store_url`.
- URL canônica: `gifts.canonical_url`.
- URL afiliada: `affiliate_links.affiliate_url`.
- Preço manual/legado: `gifts.estimated_price`.
- Preço extraído: `gifts.current_price` e `gifts.original_price`.
- Imagem principal: `gifts.image_url`.
- Imagens adicionais: `gifts.image_urls` em JSONB.
- Imagens manuais podem ser enviadas ao bucket `gift-images`.

O fallback manual permite nome, descrição, imagem, preço e URL mesmo quando a
extração falha. Esse comportamento é requisito de compatibilidade.

## Segurança e RLS

Todas as tabelas públicas inspecionadas têm RLS habilitada. O acesso a
`wishlists` e `gifts` usa a propriedade da lista. Porém:

- `gifts_owner_all` permite ao cliente alterar também campos técnicos;
- `product_extractions` permite INSERT e UPDATE pelo proprietário;
- `price_history_owner_all` permite escrita direta pelo cliente;
- confiança e payloads técnicos podem ser controlados pelo navegador;
- o novo modelo deve reservar escritas técnicas ao backend/service role.

As novas tabelas não terão policies de escrita para `anon` ou `authenticated`.
O frontend continuará lendo os campos espelhados em `gifts`, evitando expor
produtos e ofertas globais diretamente.

### SSRF no autofill

O `extract-product` já:

- aceita HTTP/HTTPS;
- bloqueia `localhost` e padrões explícitos de rede privada;
- usa timeout;
- limita redirects de links curtos;
- usa redirects manuais nesse caminho;
- exige sessão para a função publicada.

Lacunas encontradas:

- a validação é majoritariamente por hostname textual, sem resolução DNS;
- não há validação robusta do IP resolvido contra rebinding;
- nem todo fetch usa redirect manual seguido de revalidação;
- não há limite explícito e uniforme de bytes lidos da resposta;
- os providers e o fetch genérico não compartilham uma única política de rede.

Na Fase 0, o pipeline novo reutilizará a função atual e registrará essas lacunas.
O hardening de rede será feito de modo isolado para não reescrever providers que
já funcionam.

## Logs, métricas e feature flags

Há `console.log`, `console.warn` e `console.error`, além de `timings` e
`observability` na extração. Não há logger comum nem correlação consistente por
`operation_id`.

Não foi encontrado um sistema de feature flags. A solução inicial será um
módulo pequeno com defaults seguros:

- `commerce_ingestion_v2`;
- `product_offer_model`;
- `price_observation_capture`;
- `affiliate_url_resolution`.

No frontend, flags serão lidas de `VITE_WISHLY_FEATURE_FLAGS`. No backend, de
`WISHLY_FEATURE_FLAGS`. Produção permanecerá com o fluxo legado até ativação
explícita.

## Componentes e serviços acoplados a `gifts`

Principais pontos:

- `src/App.tsx`: cria, completa e renderiza desejos.
- `src/lib/wishly-api.ts`: lê, insere e atualiza `gifts`; consulta afiliados.
- `src/lib/product-autofill.ts`: prepara payload de extração e trava submissão.
- RPCs públicos em migrations: lista pública, reserva, contribuição e redirect.
- triggers de afiliados e compra coletiva.
- `price_history`, `price_alerts`, reservas, contribuições e templates.

Não será feita uma troca imediata de leitura. O pipeline manterá as colunas
legadas de `gifts` atualizadas como projeção compatível.

## Problemas encontrados

1. `gifts` mistura quatro conceitos diferentes.
2. Autofill e criação do item são duas operações separadas no cliente.
3. Não há idempotência persistida no backend.
4. Dedupe atual é insuficiente para produtos e ofertas.
5. O histórico está ligado ao item, não à oferta, e permanece vazio.
6. Campos técnicos são graváveis pelo cliente autenticado.
7. `provider` mistura varejista e método de extração.
8. Normalização de URL não tem contrato isolado.
9. Logs não têm correlação ponta a ponta.
10. Há drift de migrations entre repositório e produção.
11. A Edge Function é grande e concentra autenticação, rede e providers.
12. Não há lint nem ambiente automatizado de integração com Postgres.

## Dependências e compatibilidade

- Não é necessário adicionar dependência de runtime para a primeira entrega.
- O cliente Supabase existente será reutilizado.
- `gifts` continuará sendo a fonte de leitura da interface e RPCs públicos.
- `store_url`, `canonical_url`, preços e imagens legados não serão removidos.
- links afiliados legados continuarão sendo atualizados.
- itens sem URL continuam sendo criados manualmente pelo caminho atual.
- relacionamentos novos em itens antigos serão nulos até o backfill.

## Arquivos previstos

### Banco e backend

- nova migration aditiva em `supabase/migrations`;
- `supabase/functions/_shared/commerce/*`;
- `supabase/functions/ingest-product/index.ts`;
- ajustes mínimos em `supabase/functions/extract-product/index.ts` para
  contratos/segurança compartilhados, se necessários.

### Frontend

- `src/lib/feature-flags.ts`;
- `src/lib/commerce.ts` ou integração equivalente;
- `src/lib/wishly-api.ts`;
- `src/App.tsx`, somente no ponto de submissão e resolução de compra.

### Backfill, testes e documentação

- `scripts/backfill-commerce-model.mjs`;
- novos testes em `src/lib`;
- fixtures sanitizadas;
- documentação operacional em `docs/`.

## Decisões arquiteturais

1. **`gifts` continua sendo o list item.** Renomear agora quebraria RPCs,
   políticas e componentes.
2. **Produto é global e oferta pertence a varejista.** Não haverá merge por
   título.
3. **URLs têm papéis distintos.** Original nunca é substituída; canônica é
   usada para dedupe; afiliada é opcional.
4. **Escrita técnica é backend-only.** O cliente recebe um resultado projetado
   no item legado.
5. **Preço histórico pertence à oferta.** `price_history` legado não é
   removido.
6. **Idempotência usa chave por usuário/lista.** A mesma chave reaproveita a
   operação e o item já criado.
7. **Dedupe é conservador.** GTIN/EAN; depois marca+MPN+modelo; caso contrário,
   novo produto.
8. **Flags começam desligadas.** Ativação será explícita e reversível.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| drift de schema | migration aditiva, inspeção prévia e teste isolado |
| duplicação durante retry | operação persistida e constraints únicas |
| merge incorreto de produtos | não usar similaridade de título |
| quebra de lista pública | manter projeção em `gifts` e RPCs intactas |
| vazamento de dados técnicos | RLS sem policies de escrita ao cliente |
| regressão de afiliados | fallback para `affiliate_links` legado |
| SSRF por redirect/DNS | política central de URL e hardening incremental |
| backfill interrompido | lotes, checkpoint e falha por registro |
| bundle maior | lógica técnica permanece no backend |

## Métricas recomendadas

- sucesso do pipeline por etapa;
- identificação de varejista;
- captura de preço e imagem;
- itens sem preço;
- erros agrupados por domínio sanitizado;
- duração total e por etapa;
- confiança média por método;
- produtos, ofertas e itens duplicados evitados;
- observações suprimidas por idempotência;
- taxa de fallback manual.

## Decisões futuras

- política de retenção de `raw_data`;
- frequência de atualização de ofertas;
- ownership e visibilidade de produtos globais no painel administrativo;
- fonte oficial de marca/modelo quando há conflito;
- migração ou desativação futura de `price_history`;
- regra comercial para geração de `affiliate_url` por varejista;
- limites Pro para monitoramento e histórico.
