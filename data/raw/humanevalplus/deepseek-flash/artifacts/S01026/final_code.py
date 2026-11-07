from operator import index


def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    # ``index`` accepts every genuine integer-like object and also avoids
    # performing arithmetic on the caller's (possibly unusual) integer type.
    limit = index(n)
    return " ".join(map(str, range(limit + 1)))
