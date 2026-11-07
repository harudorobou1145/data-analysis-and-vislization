from operator import index


def string_sequence(n: int) -> str:
    """Return a space-delimited string of integers from 0 through ``n``.

    The endpoint is inclusive; negative bounds yield an empty string.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-1)
    ''
    """
    try:
        bound = index(n)
    except TypeError:
        # Permit numeric bounds that can be converted to an integer.
        bound = int(n)
    if bound < 0:
        return ""
    return " ".join(str(value) for value in range(bound + 1))
