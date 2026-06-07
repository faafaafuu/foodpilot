GRAPHIFY ?= graphify

.PHONY: graph graph-query lint test build prisma-validate

graph:
	$(GRAPHIFY) update . --force --no-cluster

graph-query:
	$(GRAPHIFY) query "FoodPilot architecture constraints, related files, and implementation context" --graph graphify-out/graph.json

lint:
	npm run lint

test:
	npm test

build:
	npm run build

prisma-validate:
	npm run prisma:validate

