package internal

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

func clipBase() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(filepath.Dir(exe))
}

type ProviderConfig struct {
	BaseURL string `yaml:"base_url"`
	APIKey  string `yaml:"api_key"`
}

type ClipConfig struct {
	Name     string   `yaml:"name" json:"name"`
	URL      string   `yaml:"url" json:"url"`
	Token    string   `yaml:"token" json:"-"`
	Commands []string `yaml:"commands,omitempty" json:"commands,omitempty"`
}

type BrowserConfig struct {
	Endpoint string `yaml:"endpoint"`
}

type Config struct {
	Providers map[string]ProviderConfig `yaml:"providers"`

	LLMProvider string `yaml:"llm_provider"`
	LLMModel    string `yaml:"llm_model"`

	EmbeddingProvider string `yaml:"embedding_provider"`
	EmbeddingModel    string `yaml:"embedding_model"`

	SystemPrompt string         `yaml:"system_prompt"`
	Clips        []ClipConfig   `yaml:"clips,omitempty"`
	Browser      *BrowserConfig `yaml:"browser,omitempty"`
}

func (c *Config) GetLLMProvider() (*ProviderConfig, error) {
	return c.getProvider(c.LLMProvider)
}

func (c *Config) GetEmbeddingProvider() (*ProviderConfig, error) {
	return c.getProvider(c.EmbeddingProvider)
}

func (c *Config) getProvider(name string) (*ProviderConfig, error) {
	p, ok := c.Providers[name]
	if !ok {
		return nil, fmt.Errorf("provider %q not found in config", name)
	}
	// env override: OPENROUTER_API_KEY, BAILIAN_API_KEY, etc.
	envKey := os.Getenv("OPENROUTER_API_KEY")
	if envKey != "" && name == "openrouter" {
		p.APIKey = envKey
	}
	return &p, nil
}

func (c *Config) GetClip(name string) *ClipConfig {
	for i := range c.Clips {
		if c.Clips[i].Name == name {
			return &c.Clips[i]
		}
	}
	return nil
}

func LoadConfig() (*Config, error) {
	path := filepath.Join(clipBase(), "data", "config.yaml")

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
