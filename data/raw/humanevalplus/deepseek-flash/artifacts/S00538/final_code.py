def median(l: list):
    """Return median of elements in the list l.
    >>> median([3, 1, 2, 4, 5])
    3
    >>> median([-10, 4, 6, 1000, 10, 20])
    8.0
    """
    values = sorted(l)
    n = len(values)
    if n == 0:
        raise ValueError("median() arg is an empty sequence")
    middle = n // 2
    if n % 2:
        return values[middle]
    return (values[middle - 1] + values[middle]) / 2
