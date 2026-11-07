
FIX = """
Add more test cases.
"""

def vowels_count(s):
    """Return the number of vowels in *s*.

    The vowels are ``a``, ``e``, ``i``, ``o``, and ``u`` (case-insensitive).
    A ``y`` is also counted when it is the final character of the word.

    >>> vowels_count("abcde")
    2
    >>> vowels_count("ACEDY")
    3
    """
    vowels = set("aeiou")
    count = sum(1 for char in s if char.lower() in vowels)
    if s and s[-1].lower() == "y":
        count += 1
    return count
