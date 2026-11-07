def find_max(words):
    """Return the word with the most unique characters, breaking ties lexically."""
    return min(words, key=lambda word: (-len(set(word)), word))
