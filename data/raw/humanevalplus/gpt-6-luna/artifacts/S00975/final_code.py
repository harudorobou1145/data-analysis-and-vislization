from operator import index


def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through ``n`` inclusive.

    Negative bounds produce an empty string because there are no integers in
    the requested interval. ``operator.index`` accepts integers and objects
    implementing Python's integer-index protocol.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-1)
    ''
    """
    bound = index(n)
    return " ".join(map(str, range(bound + 1)))
