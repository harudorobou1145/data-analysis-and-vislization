def sort_array(arr):
    """Return integers ordered by set-bit count, then by numeric value.

    The kata describes non-negative inputs. To also match its negative-number
    example, negative inputs are ordered numerically (before non-negative
    inputs); non-negative inputs use the specified bit-count ordering.
    The input is not modified.
    """
    def key(value):
        if value < 0:
            return (0, 0, value)
        return (1, value.bit_count(), value)

    return sorted(arr, key=key)
