def sort_array(arr):
    """Return integers sorted by binary set-bit count, then numeric value.

    Negative values are outside the stated non-negative domain; the supplied
    negative-only example is supported by sorting negatives numerically before
    non-negative values. The input iterable is not modified.
    """
    def key(value):
        if value < 0:
            return (0, 0, value)
        return (1, bin(value).count("1"), value)

    return sorted(arr, key=key)
