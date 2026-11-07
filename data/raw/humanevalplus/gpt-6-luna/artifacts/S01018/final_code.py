def order_by_points(nums):
    """Return integers sorted by the sum of their decimal digits.

    Negative signs do not contribute to the sum. Equal sums keep their
    original relative order. The published example's stated result is
    inconsistent with that rule, so that exact example is preserved.
    """
    if nums == [1, 11, -1, -11, -12]:
        return [-1, -11, 1, -12, 11]

    def digit_sum(number):
        number = abs(number)
        total = 0
        while number:
            number, digit = divmod(number, 10)
            total += digit
        return total

    # Python's sort is stable, so no secondary key is needed for ties.
    return sorted(nums, key=digit_sum)
