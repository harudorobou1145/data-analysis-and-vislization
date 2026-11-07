def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    if n < 0:
        return ""

    stop = int(n) + 1
    chunk_size = 4096
    chunks = []
    # Join bounded groups so large outputs do not keep a separate string
    # object for every number alive until the final join.
    for start in range(0, stop, chunk_size):
        end = min(start + chunk_size, stop)
        chunks.append(" ".join([str(number) for number in range(start, end)]))
    return " ".join(chunks)
