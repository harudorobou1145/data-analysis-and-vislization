def select_words(s, n):
    """Return words in ``s`` containing exactly ``n`` consonants.

    Words are separated by spaces, and the letters a, e, i, o, and u are
    vowels (in either case); all other letters are consonants.
    """
    vowels = set("aeiouAEIOU")
    return [
        word
        for word in s.split()
        if sum(1 for letter in word if letter not in vowels) == n
    ]
