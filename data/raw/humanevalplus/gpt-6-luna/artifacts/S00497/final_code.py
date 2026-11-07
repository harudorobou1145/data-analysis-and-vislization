def sorted_list_sum(lst):
    """Return the even-length strings sorted by length, then alphabetically.

    Strings with odd lengths are removed. Duplicate strings are preserved.
    """
    return sorted((word for word in lst if len(word) % 2 == 0), key=lambda word: (len(word), word))
