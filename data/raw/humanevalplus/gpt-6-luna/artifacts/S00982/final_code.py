def string_sequence(n: int) -> str:
    """Return a space-delimited string of the integers from 0 through n.

    The endpoint is inclusive. If n is negative, there are no integers in
    this interval and the returned string is empty.

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
