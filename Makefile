# Interest Led — local shortcuts. Deployment happens in GitHub Actions
# (.github/workflows/deploy.yml); nothing here touches AWS.

.PHONY: help install dev api web check migrate server apk clean

help:
	@echo "  make install   install workspace dependencies"
	@echo "  make api       run the API on :7071"
	@echo "  make web       run the app on :7070"
	@echo "  make check     typecheck + test + lint, the same gate CI runs"
	@echo "  make migrate   apply pending migrations to \$$DATABASE_URL"
	@echo "  make server    build deployment/dist/server locally"
	@echo "  make apk       build the Android APK locally (needs a JDK + Android SDK)"
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

server:
	bash deployment/scripts/build-server.sh

# The same two commands .github/workflows/android.yml runs, minus the S3
# upload. EXPO_PUBLIC_API_URL belongs on the Gradle line, which is where Metro
# bundles the JS and inlines it, and it is not optional: a native app has no
# origin to be same-origin with, so an APK built without it cannot reach the
# API at all.
apk:
	cd apps/mobile && pnpm exec expo prebuild --platform android --no-install
	cd apps/mobile/android && \
		EXPO_PUBLIC_API_URL=$${EXPO_PUBLIC_API_URL:-https://interestled.com} \
		./gradlew :app:assembleRelease --no-daemon
	@echo "APK: apps/mobile/android/app/build/outputs/apk/release/app-release.apk"

clean:
	rm -rf deployment/dist apps/mobile/dist apps/mobile/android .turbo
