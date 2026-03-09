.PHONY: build dev clean

build:
	go build -o bin/agent ./cmd/agent

dev: build
	@mkdir -p data
	@[ -f data/config.yaml ] || cp seed/config.yaml data/config.yaml
	@echo "Ready. Usage: echo '{\"message\":\"hello\"}' | commands/send"

clean:
	rm -rf bin/ data/
