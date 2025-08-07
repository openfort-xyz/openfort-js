API_DOCS_URL ?= https://api.openfort.io

.PHONY: generate-backend-openapi
generate-backend-openapi: get-backend-openapi generate-backend-api-client

.PHONY: get-backend-openapi
get-backend-openapi:
	rm -f src/backend-openapi.json && touch src/backend-openapi.json && \
	curl -H "Accept: application/json+v3" \
    $(API_DOCS_URL)/api-docs/swagger.json \
    -o src/backend-openapi.json

.PHONY: generate-backend-api-client
generate-backend-api-client:
	rm -rf src/backend && \
    mkdir src/backend && \
	docker run --rm -v $(shell pwd):/app openapitools/openapi-generator-cli:v7.0.1 generate \
    --inline-schema-options REFACTOR_ALLOF_INLINE_SCHEMAS=true \
    -i ./app/src/backend-openapi.json \
    -g typescript-axios \
    -o /app/src/backend \
    -p platform=browser \
    -c /app/config/backend.config.json
