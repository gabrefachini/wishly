# Fase 0 — operação, flags e backfill

## Estado seguro inicial

As flags ficam desligadas quando `VITE_WISHLY_FEATURE_FLAGS` não está definida.
Nesse estado, o frontend usa o fluxo legado. As tabelas novas podem ser
implantadas sem mudar a experiência atual.

## Ativar as flags

No ambiente do frontend:

```bash
VITE_WISHLY_FEATURE_FLAGS=product_offer_model,commerce_ingestion_v2,price_observation_capture,affiliate_url_resolution
```

Após alterar flags do Vite é necessário gerar e publicar um novo build.

Na Edge Function `ingest-product`, configure a variável de ambiente equivalente:

```bash
WISHLY_FEATURE_FLAGS=product_offer_model,commerce_ingestion_v2,price_observation_capture,affiliate_url_resolution
```

O endpoint retorna `feature_disabled` enquanto as duas flags-base não estiverem
ativas no backend. Isso evita que um build ativado por engano escreva no modelo
novo antes do rollout do banco.

Ordem recomendada:

1. `product_offer_model`;
2. `commerce_ingestion_v2`;
3. `price_observation_capture`;
4. `affiliate_url_resolution`.

Para rollback, remova `commerce_ingestion_v2` e publique novamente. As tabelas
novas permanecem inertes e o fluxo legado volta a ser usado.

## Backfill

O script exige `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a
service role em uma variável `VITE_*` nem no frontend.

Dry-run padrão:

```bash
node scripts/backfill-commerce-model.mjs --batch-size 50 --max-batches 1 --report phase-0-dry-run.json
```

Lote pequeno com escrita:

```bash
node scripts/backfill-commerce-model.mjs --execute --batch-size 10 --max-batches 1 --report phase-0-batch-1.json
```

Retomada:

```bash
node scripts/backfill-commerce-model.mjs --execute --batch-size 50 --cursor TOKEN_DO_RELATORIO --report phase-0-resume.json
```

Execução completa:

```bash
node scripts/backfill-commerce-model.mjs --execute --batch-size 100 --report phase-0-complete.json
```

O código de saída é `2` quando algum item falha, mas os demais itens do lote
continuam. O relatório contém `nextCursor` e falhas individuais.

## Validação

```bash
npm test
npx tsc -b --force
npm run build
npx supabase migration list
```

Antes de produção:

1. aplicar a migration em branch/ambiente isolado;
2. executar testes de owner e non-owner;
3. rodar advisors de segurança e performance;
4. implantar `ingest-product` com JWT obrigatório;
5. executar dry-run do backfill;
6. ativar somente para usuários internos;
7. acompanhar logs por `operation_id`.

## Logs e métricas

O pipeline registra JSON com:

- `operation_id`;
- etapa e status;
- duração;
- varejista;
- código de erro;
- IDs internos.

URLs completas, tokens e dados pessoais não devem aparecer no log. Métricas
recomendadas estão listadas em `docs/phase-0-audit.md`.

## Rollback do schema

Não faça rollback destrutivo depois de iniciar o backfill. O rollback operacional
é desligar flags e manter as estruturas novas. Em ambiente descartável, as FKs
adicionadas a `gifts` podem ser removidas antes das tabelas, na ordem inversa da
migration.
