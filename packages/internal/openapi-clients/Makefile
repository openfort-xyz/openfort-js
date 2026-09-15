API_DOCS_URL ?= https://api.openfort.io

.PHONY: generate-backend-openapi
generate-backend-openapi: get-backend-openapi generate-backend-api-client

.PHONY: get-backend-openapi
get-backend-openapi:
	@echo "Fetching merged OpenAPI spec..."
	curl -sf $(API_DOCS_URL)/api-docs/openapi-full.json \
    -o src/backend-openapi.json

.PHONY: generate-backend-api-client
generate-backend-api-client:
	@echo "Generating TypeScript client from merged OpenAPI spec..."
	rm -rf src/backend && \
    mkdir src/backend && \
	docker run --rm -v $(shell pwd):/app openapitools/openapi-generator-cli:v7.0.1 generate \
    --skip-validate-spec \
    --inline-schema-options REFACTOR_ALLOF_INLINE_SCHEMAS=true \
    -i ./app/src/backend-openapi.json \
    -g typescript-axios \
    -o /app/src/backend \
    -p platform=browser \
    -c /app/config/backend.config.json
