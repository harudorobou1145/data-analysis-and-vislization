def sorted_list_sum(lst):
    """Filter out words with odd lengths and return the remaining words sorted.

    Words are ordered first by length and then alphabetically when their
    lengths are equal.
    """
    return sorted(
        (word for word in lst if len(word) % 2 == 0),
        key=lambda word: (len(word), word),
    )
