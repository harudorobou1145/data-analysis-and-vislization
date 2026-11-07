def find_max(words):
    """Return the word with the most unique characters.

    Break ties by choosing the lexicographically smallest word.
    """
    return min(words, key=lambda word: (-len(set(word)), word))
