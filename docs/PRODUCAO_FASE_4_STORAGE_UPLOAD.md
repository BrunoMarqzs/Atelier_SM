# Produção - Fase 4: Storage e upload profissional

## Decisão arquitetural

O pedido e as imagens passam a ter responsabilidades separadas. O pedido é criado primeiro; em seguida, cada imagem é enviada para um endpoint próprio, validada pelo backend e persistida com metadados.

## Implementações

- validação real de assinatura do arquivo, não apenas extensão;
- MIME types permitidos: JPEG, PNG e WebP;
- limite de tamanho configurável por `MAX_UPLOAD_SIZE_BYTES`;
- geração de nome seguro com UUID;
- organização local por ano/mês;
- exposição segura de arquivos locais via `/uploads`;
- persistência de metadados:
  - `thumbnail_url`;
  - `original_filename`;
  - `mime_type`;
  - `size_bytes`;
- migration `20260519_0003_request_image_metadata`;
- frontend deixa de enviar base64 na criação do pedido;
- frontend cria o pedido e depois faz upload das imagens;
- preview administrativo usa a URL persistida retornada pelo backend.

## Impactos

O banco passa a guardar URLs persistentes e metadados úteis para auditoria, inspeção e futura migração para Cloudinary ou S3. O app reduz payloads grandes em JSON e evita dados temporários frágeis.

## Riscos controlados

- thumbnails locais ainda apontam para a imagem original; geração real de miniaturas pode entrar quando adicionarmos Pillow ou storage externo;
- Cloudinary/S3 fica preparado conceitualmente, mas o ambiente atual segue com storage local robustecido;
- em produção, `/uploads` deve ser substituído por CDN ou bucket gerenciado.

## Variáveis novas

- `MAX_UPLOAD_SIZE_BYTES`;
- `ALLOWED_IMAGE_MIME_TYPES`.

## Próximos passos

1. Integrar Cloudinary ou S3 com secrets gerenciados.
2. Gerar thumbnails reais no backend ou no provider.
3. Remover arquivos órfãos quando pedido ou imagem forem excluídos.
