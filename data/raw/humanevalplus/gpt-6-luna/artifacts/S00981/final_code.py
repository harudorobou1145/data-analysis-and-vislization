def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 to ``n`` inclusive.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    return " ".join(str(i) for i in range(n + 1))
