def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 to ``n``, including both ends.

    The sequence advances by one toward ``n``; for a negative bound it moves
    downward from zero.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    >>> string_sequence(-3)
    '0 -1 -2 -3'
    """
    bound = int(n)
    step = 1 if bound >= 0 else -1
    return " ".join(str(value) for value in range(0, bound + step, step))
