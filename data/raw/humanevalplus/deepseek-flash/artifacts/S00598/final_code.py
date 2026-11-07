def select_words(s, n):
    """Return words in *s* containing exactly *n* consonants.

    Vowels are ``a``, ``e``, ``i``, ``o``, and ``u`` (case-insensitive);
    all other letters, including ``y``, are consonants.  Words are returned
    in their original order and with their original casing.
    """
    if not s:
        return []

    vowels = set("aeiouAEIOU")
    return [
        word
        for word in s.split()
        if sum(char not in vowels for char in word) == n
    ]
