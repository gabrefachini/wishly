# Fase 0 — plano de implementação

Este plano parte da auditoria em `docs/phase-0-audit.md`. Todas as etapas são
aditivas, compatíveis com `gifts` e ativáveis por feature flag.

## 1. Fundação de schema

**Objetivo:** criar o modelo normalizado e referências opcionais no item.

**Arquivos:** nova migration em `supabase/migrations`.

**Migration:** criar `retailers`, `products`, `product_offers`,
`price_observations` e `commerce_ingestion_operations`; adicionar
`product_id`, `selected_offer_id` e `ingestion_operation_id` a `gifts`.

**Riscos:** drift remoto; constraints incompatíveis; grants excessivos.

**Testes:** aplicar em banco isolado; verificar tabelas, FKs, constraints,
índices e RLS; executar advisors.

**Aceite:** migration aditiva, campos legados intactos, preços não negativos,
confiança entre 0 e 1 e relações novas opcionais.

**Rollback:** remover somente referências e tabelas novas se ainda não houver
consumidores; não alterar `gifts` legado.

## 2. Tipos e contratos

**Objetivo:** definir tipos compartilhados para URL, adapters, extração e
matching.

**Arquivos:** `supabase/functions/_shared/commerce/contracts.ts`.

**Migration:** nenhuma.

**Riscos:** divergir do payload atual de `extract-product`.

**Testes:** typecheck e testes de mapeamento do payload legado.

**Aceite:** sem `any`, códigos de erro estáveis e payload parcial suportado.

**Rollback:** remover módulo sem efeito no fluxo legado.

## 3. Normalizador de URL

**Objetivo:** normalizar sem rede e com regras extensíveis por varejista.

**Arquivos:** `url-normalizer.ts`, testes e fixtures.

**Migration:** seed inicial de retailers pode ficar na migration da etapa 1.

**Riscos:** remover parâmetro funcional; dedupe incorreto.

**Testes:** protocolos, host, fragmentos, tracking, seller/variant, IDs de
Mercado Livre, Amazon e Shopify, URL inválida e host privado.

**Aceite:** resultado determinístico com URL original, canônica, IDs, parâmetros
removidos e confiança.

**Rollback:** pipeline volta a usar URL original.

## 4. Adapter do autofill atual

**Objetivo:** converter `extract-product` para o contrato comum sem reescrever
providers.

**Arquivos:** `legacy-extraction-adapter.ts`, contratos e testes.

**Migration:** nenhuma.

**Riscos:** perda de campos ou confiança.

**Testes:** fixtures de sucesso, parcial, sem preço e provider desconhecido.

**Aceite:** payload atual mapeado para produto/oferta com warnings preservados.

**Rollback:** desativar `commerce_ingestion_v2`.

## 5. Matching e deduplicação

**Objetivo:** aplicar regras conservadoras e explicar método/confiança.

**Arquivos:** `matching.ts` e testes.

**Migration:** índices únicos parciais em GTIN/EAN, retailer+external ID e URL
canônica.

**Riscos:** corrida entre operações e merge indevido.

**Testes:** GTIN/EAN, marca+MPN+modelo, external ID, canonical URL e ausência de
match por título.

**Aceite:** regras determinísticas e protegidas por constraints.

**Rollback:** sempre criar novo produto; manter dedupe apenas de oferta.

## 6. Pipeline central

**Objetivo:** executar validação, extração, matching, persistência e criação do
item em uma única Edge Function.

**Arquivos:** `supabase/functions/ingest-product/index.ts` e módulos
compartilhados.

**Migration:** funções SQL auxiliares somente se uma transação RPC for
necessária.

**Riscos:** operação parcialmente persistida e indisponibilidade do autofill.

**Testes:** autenticação, permissão da lista, sucesso, parcial, manual, retry e
idempotência.

**Aceite:** interface chama um endpoint; item, produto, oferta e observação são
criados/reutilizados; warnings retornam ao cliente.

**Rollback:** desligar flag e manter `createGift`.

## 7. Histórico de preço

**Objetivo:** registrar a primeira e próximas observações por oferta.

**Arquivos:** pipeline e migration.

**Migration:** `price_observations` com chave de operação e janela curta contra
duplicatas.

**Riscos:** crescimento sem retenção; observações redundantes.

**Testes:** preço, disponibilidade sem preço, retry e operação repetida.

**Aceite:** histórico append-only e oferta atualizada sem sobrescrever
observações antigas.

**Rollback:** desligar `price_observation_capture`; manter ofertas.

## 8. Resolução de afiliados

**Objetivo:** centralizar a URL de compra e preservar o mecanismo legado.

**Arquivos:** `purchase-url.ts`, `public-gift-redirect.ts` e pontos de clique.

**Migration:** nenhuma inicialmente; `product_offers.affiliate_url` já existe.

**Riscos:** perder tracking ou URL original.

**Testes:** afiliada válida, afiliada inválida, original e fallback legado.

**Aceite:** nunca retornar URL fora de HTTP/HTTPS e nunca alterar a original.

**Rollback:** resolver por `affiliate_links`/`store_url`.

## 9. Feature flags e integração da interface

**Objetivo:** ativar o pipeline por ambiente/usuário sem quebrar o fallback
manual.

**Arquivos:** `src/lib/feature-flags.ts`, `wishly-api.ts`, `App.tsx`.

**Migration:** nenhuma.

**Riscos:** divergência entre preview e persistência.

**Testes:** flags desligadas/ligadas, item manual, autofill parcial e falha.

**Aceite:** fluxo legado intacto quando desligado; pipeline central quando
ligado; formulário manual sempre disponível.

**Rollback:** remover flags da configuração.

## 10. Backfill

**Objetivo:** vincular itens antigos em lotes, com retomada e dry-run.

**Arquivos:** `scripts/backfill-commerce-model.mjs` e documentação.

**Migration:** nenhuma.

**Riscos:** duplicação ou carga excessiva.

**Testes:** dry-run, lote pequeno, retomada, falha isolada e reexecução.

**Aceite:** não altera campos legados; produz resumo; checkpoint por ID/data;
primeiro preço conhecido vira observação.

**Rollback:** referências em `gifts` podem ser anuladas; dados normalizados ficam
para auditoria e dedupe.

## 11. RLS e segurança

**Objetivo:** impedir escrita técnica no cliente e endurecer SSRF.

**Arquivos:** migration, `extract-product` e módulos de rede.

**Migration:** RLS sem policies de mutação para tabelas técnicas; futura
restrição granular de colunas em `gifts`.

**Riscos:** bloquear fluxo legado se grants forem removidos cedo.

**Testes:** proprietário/não proprietário, anon, alteração de confiança,
localhost, IP privado, metadata, redirect e resposta grande.

**Aceite:** somente backend escreve observações/confiança; lista é validada pelo
usuário autenticado.

**Rollback:** manter RLS e reativar somente policies mínimas necessárias.

## 12. Observabilidade

**Objetivo:** correlacionar todas as etapas por `operation_id`.

**Arquivos:** `logger.ts`, pipeline e documentação.

**Migration:** operação persiste status, etapa, erro e timestamps.

**Riscos:** logs com URL ou payload sensível.

**Testes:** sanitização de domínio, códigos estáveis e duração.

**Aceite:** logs JSON estruturados sem URL completa, token ou PII.

**Rollback:** logs podem ser reduzidos sem afetar persistência.

## 13. Validação e rollout

**Objetivo:** provar compatibilidade antes da ativação.

**Arquivos:** testes, fixtures, documentação e configuração.

**Migration:** aplicar primeiro em branch/ambiente isolado e só depois em
produção.

**Riscos:** drift e comportamento diferente da produção.

**Testes:** `npm test`, `npx tsc -b --force`, `npm run build`, integração com
Supabase isolado, advisors e smoke test do Amplify.

**Aceite:** testes passam; flags desligadas em produção; backfill em dry-run;
ativação interna monitorada.

**Rollback:** desligar flags imediatamente; migrations permanecem aditivas e
inertes.

## Checkpoints lógicos

1. documentação e auditoria;
2. schema + contratos + normalização;
3. matching + pipeline + histórico;
4. afiliados + frontend + flags;
5. backfill + segurança + observabilidade;
6. testes, rollout e documentação operacional.

## Ordem de ativação recomendada

1. aplicar schema sem ativar flags;
2. implantar `ingest-product`;
3. executar backfill em dry-run;
4. ativar `product_offer_model` e `commerce_ingestion_v2` em desenvolvimento;
5. ativar para usuários internos;
6. ativar `price_observation_capture`;
7. ativar `affiliate_url_resolution`;
8. executar backfill em lotes pequenos;
9. ampliar rollout após métricas estáveis.
