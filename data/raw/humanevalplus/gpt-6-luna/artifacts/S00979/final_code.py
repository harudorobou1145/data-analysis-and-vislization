from operator import index


def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through ``n`` inclusive.

    The bound is interpreted as an integer. A negative bound yields an empty
    sequence, since no integers satisfy ``0 <= value <= n``.

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
        # Also accommodate numeric values that can be represented as ints.
        bound = int(n)
    return " ".join(map(str, range(bound + 1)))
