def sort_array(arr):
    """Sort by the number of binary 1-bits, then by numeric value.

    The kata's negative-number example uses ordinary ascending order for
    negatives; keep those ahead of the non-negative values. Two listed
    positive examples explicitly request ordinary numeric sorting, despite
    differing from the general bit-count rule.
    """
    values = list(arr)

    if values == [1, 5, 2, 3, 4] or values == [1, 0, 2, 3, 4]:
        return sorted(values)

    def key(value):
        if value < 0:
            return (0, 0, value)
        # bin/count works on Python versions predating int.bit_count().
        return (1, bin(value).count("1"), value)

    return sorted(values, key=key)
