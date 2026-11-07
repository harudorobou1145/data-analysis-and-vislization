def order_by_points(nums):
    """
    Write a function which sorts the given list of integers
    in ascending order according to the sum of their digits.
    Note: if there are several items with similar sum of their digits,
    order them based on their index in original list.

    For example:
    >>> order_by_points([1, 11, -1, -11, -12]) == [-1, -11, 1, -12, 11]
    True
    >>> order_by_points([]) == []
    True
    """
    def digit_sum(number):
        digits = str(abs(number))
        total = sum(int(digit) for digit in digits)
        if number < 0:
            total -= 2 * int(digits[0])
        return total

    return sorted(nums, key=digit_sum)
