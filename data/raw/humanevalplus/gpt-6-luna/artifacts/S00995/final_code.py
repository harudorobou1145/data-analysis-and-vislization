def median(l: list):
    """Return the median of the elements in ``l``.

    The input is not modified. An empty input raises ``ValueError``.

    >>> median([3, 1, 2, 4, 5])
    3
    >>> median([1, 4, 6, 10, 20, 1000])
    8.0
    """
    if not l:
        raise ValueError("median() arg is an empty sequence")

    ordered = sorted(l)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2
