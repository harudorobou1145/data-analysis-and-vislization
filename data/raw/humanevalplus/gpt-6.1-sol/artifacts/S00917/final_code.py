from operator import index


def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through n, inclusive.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    stop = index(n) + 1
    return " ".join(map(str, range(stop)))
