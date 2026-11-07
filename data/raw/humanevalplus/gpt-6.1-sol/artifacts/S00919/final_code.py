from operator import index


def string_sequence(n: int) -> str:
    """Return space-delimited integers from 0 through n, inclusive.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    stop = index(n) + 1
    chunk_size = 10000
    # Bound the number of temporary per-number strings for large sequences.
    return " ".join(
        " ".join(map(str, range(start, min(start + chunk_size, stop))))
        for start in range(0, stop, chunk_size)
    )
