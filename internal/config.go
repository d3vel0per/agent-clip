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

type ClipConfig struct {
	Name     string   `yaml:"name" json:"name"`
	URL      string   `yaml:"url" json:"url"`
	Token    string   `yaml:"token" json:"-"`
	Commands []string `yaml:"commands,omitempty" json:"commands,omitempty"` // cached from GetInfo
}

type Config struct {
	Model        string       `yaml:"model"`
	LLMBaseURL   string       `yaml:"llm_base_url"`
	APIKey       string       `yaml:"api_key"`
	SystemPrompt string       `yaml:"system_prompt"`
	Clips        []ClipConfig `yaml:"clips,omitempty"`
}

func (c *Config) GetAPIKey() string {
	if key := os.Getenv("OPENROUTER_API_KEY"); key != "" {
		return key
	}
	return c.APIKey
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
