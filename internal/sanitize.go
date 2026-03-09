package internal

import "strings"

// ExtractUserContent strips XML wrapper from user messages,
// returning only the <user> tag inner content.
// Input: "<user>\nhello\n</user>\n\n<environment>...</environment>"
// Output: "hello"
func ExtractUserContent(content string) string {
	start := strings.Index(content, "<user>")
	end := strings.Index(content, "</user>")
	if start >= 0 && end > start {
		return strings.TrimSpace(content[start+len("<user>") : end])
	}
	return content
}

// ExtractThinking splits <think>...</think> from assistant content
// into separate content and reasoning strings.
func ExtractThinking(content, existingReasoning string) (cleanContent, reasoning string) {
	start := strings.Index(content, "<think>")
	if start < 0 {
		return content, existingReasoning
	}

	end := strings.Index(content, "</think>")
	if end < 0 {
		// unclosed <think> tag — everything after <think> is thinking
		thinking := strings.TrimSpace(content[start+len("<think>"):])
		clean := strings.TrimSpace(content[:start])
		if existingReasoning == "" {
			return clean, thinking
		}
		return clean, existingReasoning
	}

	thinking := strings.TrimSpace(content[start+len("<think>") : end])
	clean := strings.TrimSpace(content[:start] + content[end+len("</think>"):])

	if existingReasoning == "" {
		return clean, thinking
	}
	return clean, existingReasoning
}
