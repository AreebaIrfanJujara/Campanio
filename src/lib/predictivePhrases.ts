/**
 * Intelligent Predictive Phrase Engine for Companio
 * Context-aware n-gram and prefix suggestions for AAC and Conversation typing.
 */

const COMMON_PREDICTIONS: Record<string, string[]> = {
  "": ["I need", "Where is", "Thank you", "Please help", "Yes", "No", "Excuse me", "How much"],
  "i": ["need", "want", "am", "feel", "can't", "have", "would like"],
  "i need": ["water", "help", "my medication", "a moment", "to find the restroom", "assistance", "a doctor", "to sit down"],
  "where": ["is the restroom?", "is the exit?", "is the elevator?", "can I sit?", "is the doctor?", "is the pharmacy?"],
  "where is": ["the restroom?", "the elevator?", "the pharmacy?", "the main exit?", "the doctor?", "the nearest bus stop?"],
  "please": ["help me", "repeat that", "wait a moment", "write it down", "call an ambulance", "show me the way", "speak louder"],
  "please help": ["me get to the elevator", "me find my way", "me read this label", "me stand up", "call my emergency contact"],
  "thank": ["you very much", "you for your help", "you, I understand", "you, that is clear"],
  "can": ["you help me?", "you please repeat?", "I have a glass of water?", "you guide me?", "we go slower?"],
  "can you": ["help me?", "repeat that please?", "read this text for me?", "point me towards the exit?", "call someone for me?"],
  "how": ["much does this cost?", "do I get to the 3rd floor?", "long will it take?", "are you doing?"],
  "how much": ["does this cost?", "is the total?", "do I owe you?", "time do we have?"],
  "yes": [", please", ", that is correct", ", I agree", ", thank you"],
  "no": [", thank you", ", that is not right", ", I need something else", ", I am okay"],
  "help": ["me please", "is on the way", "with my bag", "with directions"],
};

export function getPredictiveSuggestions(currentInput: string, maxResults: number = 5): string[] {
  const normalized = currentInput.trim().toLowerCase();

  // 1. Exact phrase match in prediction tree
  if (COMMON_PREDICTIONS[normalized]) {
    return COMMON_PREDICTIONS[normalized].slice(0, maxResults);
  }

  // 2. Prefix match on last 1-2 words
  const words = normalized.split(/\s+/);
  if (words.length >= 2) {
    const twoWordKey = words.slice(-2).join(" ");
    if (COMMON_PREDICTIONS[twoWordKey]) {
      return COMMON_PREDICTIONS[twoWordKey].slice(0, maxResults);
    }
  }

  const lastWord = words[words.length - 1];
  if (lastWord && COMMON_PREDICTIONS[lastWord]) {
    return COMMON_PREDICTIONS[lastWord].slice(0, maxResults);
  }

  // 3. Fallback prefix autocomplete across all suggestion values
  const allPhrases = Object.values(COMMON_PREDICTIONS).flat();
  const filtered = allPhrases.filter((phrase) =>
    phrase.toLowerCase().startsWith(lastWord || "")
  );

  const unique = Array.from(new Set(filtered.length > 0 ? filtered : COMMON_PREDICTIONS[""]));
  return unique.slice(0, maxResults);
}
