from math import floor
from operator import index


def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through n, inclusive.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    try:
        upper_bound = index(n)
    except TypeError:
        upper_bound = floor(n)
    return " ".join(map(str, range(upper_bound + 1)))
