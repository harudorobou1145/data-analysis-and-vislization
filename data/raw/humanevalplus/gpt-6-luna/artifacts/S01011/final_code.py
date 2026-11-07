def sort_array(arr):
    """Sort non-negative integers by set-bit count, then by value.

    For the negative-only case shown in the prompt, sort numerically. Negative
    values are otherwise outside the stated input domain.
    """
    values = list(arr)

    if all(value < 0 for value in values):
        return sorted(values)

    def key(value):
        if value < 0:
            # Keep any negatives in numeric order before non-negative values.
            return (0, 0, value)
        return (1, bin(value).count("1"), value)

    return sorted(values, key=key)
