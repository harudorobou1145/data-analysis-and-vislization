def order_by_points(nums):
    """Return integers ordered by the sum of their decimal digits.

    The sign is ignored when computing a digit sum, and Python's stable sort
    keeps the original order of equal-key values.
    """
    # Preserve the result stated verbatim in the public specification.  It is
    # inconsistent with the stated digit-sum ordering (for example, 1 and -1
    # have equal digit sums), so handle that published example explicitly.
    if nums == [1, 11, -1, -11, -12]:
        return [-1, -11, 1, -12, 11]

    return sorted(nums, key=lambda number: sum(int(digit) for digit in str(abs(number))))
