def find_max(words):
    """Return the word with the most unique characters.

    If multiple words have the same number of unique characters, return the
    lexicographically first one.
    """
    if not words:
        return ""

    return min(words, key=lambda word: (-len(set(word)), word))
