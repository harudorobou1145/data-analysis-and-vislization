def sort_array(arr):
    """
    Sort integers by the number of ones in their binary representation,
    breaking ties by decimal value. Return a new list.

    For negative integers, count the ones in the binary representation
    of their absolute value.
    """
    return sorted(arr, key=lambda value: (bin(value).count("1"), value))
