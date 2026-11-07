def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    stop = n + 1
    chunk_size = 10_000
    # Bound temporary number strings when producing a large sequence.
    return " ".join(
        " ".join(
            str(number)
            for number in range(start, min(start + chunk_size, stop))
        )
        for start in range(0, stop, chunk_size)
    )
