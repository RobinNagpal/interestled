# LearnLoop — local shortcuts. Deployment happens in GitHub Actions
# (.github/workflows/deploy.yml); nothing here touches AWS.

.PHONY: help install dev api web check migrate lambda clean

help:
	@echo "  make install   install workspace dependencies"
	@echo "  make api       run the API on :7071"
	@echo "  make web       run the app on :7070"
	@echo "  make check     typecheck + test + lint, the same gate CI runs"
	@echo "  make migrate   apply pending migrations to \$$DATABASE_URL"
	@echo "  make lambda    build deployment/dist/lambda.zip locally"
	@echo "  make clean     remove build output"

install:
	pnpm install

api:
	pnpm --filter server dev

web:
	pnpm --filter mobile dev

# The same three commands the deploy workflow gates on, so a red check here is
# a red check there.
check:
	pnpm typecheck
	pnpm test
	pnpm lint

migrate:
	pnpm --filter server exec prisma migrate deploy

lambda:
	bash deployment/scripts/build-lambda.sh

clean:
	rm -rf deployment/dist apps/mobile/dist .turbo
