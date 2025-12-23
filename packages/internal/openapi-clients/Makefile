API_DOCS_URL ?= https://api.openfort.io

.PHONY: generate-backend-openapi
generate-backend-openapi: get-backend-openapi get-auth-openapi merge-openapi-specs generate-backend-api-client clean-openapi

.PHONY: get-backend-openapi
get-backend-openapi:
	@echo "Fetching main API OpenAPI spec..."
	curl -H "Accept: application/json+v3" \
    $(API_DOCS_URL)/api-docs/swagger.json \
    -o src/backend-openapi-main.json

.PHONY: get-auth-openapi
get-auth-openapi:
	@echo "Fetching better-auth OpenAPI spec..."
	curl -s $(API_DOCS_URL)/iam/v2/auth/reference \
	-o src/backend-openapi-auth.json

.PHONY: merge-openapi-specs
merge-openapi-specs:
	@echo "Merging OpenAPI specifications..."
	@if ! command -v openapi-merge-cli >/dev/null 2>&1; then \
		echo "Installing openapi-merge-cli..."; \
		npm install -g openapi-merge-cli; \
	fi
	@if [ ! -s src/backend-openapi-auth.json ]; then \
		echo "Warning: backend-openapi-auth.json is empty, copying main spec only..."; \
		cp src/backend-openapi-main.json src/backend-openapi.json; \
	else \
		openapi-merge-cli --config ./config/merge-config.json || cp src/backend-openapi-main.json src/backend-openapi.json; \
	fi
	@echo "Merged OpenAPI specs successfully"
	@echo "Fixing OpenAPI spec..."
	@node ./scripts/fix-openapi-spec.cjs

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

.PHONY: clean-openapi
clean-openapi:
	@echo "Cleaning up OpenAPI files..."
	rm -f src/backend-openapi-main.json src/backend-openapi-auth.json
