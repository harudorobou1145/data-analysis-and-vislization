def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through ``n`` inclusive.

    When ``n`` is negative there are no integers in the interval, so the
    result is the empty string.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-1)
    ''
    """
    return " ".join(str(value) for value in range(n + 1))
