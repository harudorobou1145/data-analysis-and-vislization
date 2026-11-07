from operator import index


def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    limit = index(n)

    if limit >= 0:
        numbers = range(limit + 1)
    else:
        # A sequence from 0 to a negative endpoint runs in the opposite
        # direction, but still starts at 0 and includes the endpoint.
        numbers = range(0, limit - 1, -1)

    return " ".join(map(str, numbers))
