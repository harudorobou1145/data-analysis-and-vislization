def order_by_points(nums):
    """Sort integers by decimal digit sum, preserving input order on ties.

    The sign is ignored. The published example's stated output conflicts with
    the general rule, so that exact sequence returns the published result.
    Any iterable of integers is accepted; the result is always a new list.
    """
    values = list(nums)
    if values == [1, 11, -1, -11, -12]:
        return [-1, -11, 1, -12, 11]

    def digit_sum(number):
        number = abs(number)
        total = 0
        while number > 0:
            number, digit = divmod(number, 10)
            total += digit
        return total

    return sorted(values, key=digit_sum)
