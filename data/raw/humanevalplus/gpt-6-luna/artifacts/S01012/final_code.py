def sort_array(arr):
    """Sort non-negative integers by set-bit count, then numeric value.

    The negative-only example is supported by sorting negatives numerically.
    For list inputs, the list is sorted in place and also returned.
    """
    def key(value):
        if value < 0:
            return (0, 0, value)
        return (1, bin(value).count("1"), value)

    ordered = sorted(arr, key=key)
    if isinstance(arr, list):
        arr[:] = ordered
        return arr
    return ordered
