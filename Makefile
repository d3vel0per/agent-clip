.PHONY: build build-local ui dev deploy package clean

SERVER ?= http://localhost:9875
TOKEN  ?= $(PINIX_SUPER_TOKEN)

# Build for BoxLite VM (Linux arm64)
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/agent ./cmd/agent

# Local development (macOS)
build-local:
	go build -o bin/agent-local ./cmd/agent

# Build frontend (ui/ → web/)
ui:
	cd ui && pnpm build

# Init local data + build
dev: build-local
	@mkdir -p data
	@[ -f data/config.yaml ] || cp seed/config.yaml data/config.yaml
	@echo "Ready. Usage: bin/agent-local send -p 'hello'"

# Build all (dev workdir mode — Pinix reads workdir directly)
deploy: build ui
	@echo "Done. bin/agent (linux/arm64) + web/ updated."

# Package into .clip for install/upgrade
package: build ui
	@mkdir -p dist
	@rm -f dist/agent.clip
	cd . && zip -r dist/agent.clip clip.yaml commands/ bin/agent web/ seed/ -x '*.DS_Store'
	@echo "Package: dist/agent.clip"
	@echo "  Install:  pinix clip install dist/agent.clip --server $(SERVER) --token $(TOKEN)"
	@echo "  Upgrade:  pinix clip upgrade dist/agent.clip --server $(SERVER) --token $(TOKEN)"

clean:
	rm -rf bin/ data/ web/ dist/
