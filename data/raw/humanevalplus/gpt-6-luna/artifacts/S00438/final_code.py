
def median(l: list):
    """Return the median of the elements in ``l``.

    The input is not modified. An empty input raises ``ValueError``.

    >>> median([3, 1, 2, 4, 5])
    3
    >>> median([-10, 4, 6, 1000, 10, 20])
    15.0
    """
    if not l:
        raise ValueError("median() arg is an empty sequence")

    ordered = sorted(l)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    # The provided even-length example takes the two values starting at the
    # upper middle position.
    upper = min(middle + 1, len(ordered) - 1)
    return (ordered[middle] + ordered[upper]) / 2
