package internal

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Model        string `yaml:"model"`
	LLMBaseURL   string `yaml:"llm_base_url"`
	APIKey       string `yaml:"api_key"`
	SystemPrompt string `yaml:"system_prompt"`
}

func (c *Config) GetAPIKey() string {
	if key := os.Getenv("OPENROUTER_API_KEY"); key != "" {
		return key
	}
	return c.APIKey
}

func LoadConfig() (*Config, error) {
	// resolve data/config.yaml relative to the binary's parent dir
	exe, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("resolve executable: %w", err)
	}
	base := filepath.Dir(filepath.Dir(exe)) // bin/agent → repo root
	path := filepath.Join(base, "data", "config.yaml")

	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	return &cfg, nil
}
