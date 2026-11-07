def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through ``n`` inclusive.

    If ``n`` is negative, the interval contains no values and the result is
    the empty string.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-1)
    ''
    """
    if n < 0:
        return ""
    return " ".join(map(str, range(n + 1)))
