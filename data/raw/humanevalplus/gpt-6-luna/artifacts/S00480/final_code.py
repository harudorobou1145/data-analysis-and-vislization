def order_by_points(nums):
    """
    Sort integers in ascending order by the sum of their decimal digits.
    Negative signs are ignored. Python's stable sort preserves the original
    order of values whose digit sums are equal.

    >>> order_by_points([1, 11, -1, -11, -12])
    [1, -1, 11, -11, -12]
    >>> order_by_points([])
    []
    """
    return sorted(nums, key=lambda number: sum(int(digit) for digit in str(abs(number))))
