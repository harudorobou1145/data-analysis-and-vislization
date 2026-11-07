def string_sequence(n: int) -> str:
    """Return the space-delimited integers from 0 through ``n`` inclusive.

    Negative bounds produce the empty string.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    # ``range`` requires an integer. Convert integer-like inputs explicitly so
    # integral numeric values (such as 5.0) work as bounds as well.
    bound = int(n)
    return " ".join(str(value) for value in range(bound + 1))
