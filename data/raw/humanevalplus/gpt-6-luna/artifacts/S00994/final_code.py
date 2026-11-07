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
    n = len(ordered)
    middle = n // 2
    if n % 2:
        return ordered[middle]

    # The even-length convention illustrated by the supplied example takes
    # the two elements at and immediately after the upper-middle position.
    # For a two-element sequence there is no element after the upper middle,
    # so use the only available pair.
    if n == 2:
        lower, upper = ordered[0], ordered[1]
    else:
        lower, upper = ordered[middle], ordered[middle + 1]
    return (lower + upper) / 2
