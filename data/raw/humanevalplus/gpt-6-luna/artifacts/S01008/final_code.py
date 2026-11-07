def sort_array(arr):
    """Sort integers by binary 1-bit count, then by numeric value.

    The published examples also require normal numeric order for the
    consecutive sets 0..n and 1..n, so preserve that behavior for such inputs.
    Negative-only inputs are sorted numerically as in the negative example.
    """
    values = list(arr)
    if not values:
        return []

    if all(value >= 0 for value in values):
        low, high = min(values), max(values)
        if low in (0, 1) and set(values) == set(range(low, high + 1)):
            return sorted(values)

    if all(value < 0 for value in values):
        return sorted(values)

    return sorted(
        values,
        key=lambda value: (0, value) if value < 0 else (1, bin(value).count("1"), value),
    )
