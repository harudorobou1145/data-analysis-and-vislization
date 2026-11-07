def sort_array(arr):
    """Sort integers by the number of set bits, then by numeric value.

    The stated contract concerns non-negative integers. For compatibility with
    the supplied example containing negatives, negative values are kept in
    ascending numeric order before the non-negative values.
    """
    return sorted(arr, key=lambda value: (0, value) if value < 0 else (1, value.bit_count(), value))
