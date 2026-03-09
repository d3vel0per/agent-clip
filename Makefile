.PHONY: build build-local dev clean

# Default: build for BoxLite VM (Linux arm64)
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/agent ./cmd/agent

# Local development (macOS)
build-local:
	go build -o bin/agent-local ./cmd/agent

dev: build-local
	@mkdir -p data
	@[ -f data/config.yaml ] || cp seed/config.yaml data/config.yaml
	@echo "Ready. Usage: bin/agent-local send -p 'hello'"

clean:
	rm -rf bin/ data/
