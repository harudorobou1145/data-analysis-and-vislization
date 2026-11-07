def sort_array(arr):
    """Sort integers by binary one-count, then by numeric value.

    For negative integers, count the ones in the binary representation of
    their absolute value. Return a new list without changing the input.

    >>> sort_array([1, 5, 2, 3, 4])
    [1, 2, 4, 3, 5]
    >>> sort_array([-2, -3, -4, -5, -6])
    [-4, -2, -6, -5, -3]
    >>> sort_array([1, 0, 2, 3, 4])
    [0, 1, 2, 4, 3]
    """
    return sorted(arr, key=lambda value: (bin(value).count("1"), value))
