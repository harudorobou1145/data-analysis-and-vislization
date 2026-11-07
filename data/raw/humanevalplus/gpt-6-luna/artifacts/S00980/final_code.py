from operator import index


def string_sequence(n: int) -> str:
    """Return the space-delimited integers between zero and ``n`` inclusive.

    Values are written in increasing numerical order, regardless of which
    endpoint is smaller.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-3)
    '-3 -2 -1 0'
    """
    try:
        bound = index(n)
    except TypeError:
        bound = int(n)
    lower, upper = sorted((0, bound))
    return " ".join(map(str, range(lower, upper + 1)))
