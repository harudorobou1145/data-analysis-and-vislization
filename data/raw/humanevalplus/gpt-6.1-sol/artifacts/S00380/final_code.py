def order_by_points(nums):
    """
    Write a function which sorts the given list of integers
    in ascending order according to the sum of their digits.
    Note: if there are several items with similar sum of their digits,
    order them based on their index in original list.

    For negative integers, the minus sign applies to the first digit.

    For example:
    >>> order_by_points([1, 11, -1, -11, -12]) == [-1, -11, 1, -12, 11]
    >>> order_by_points([]) == []
    """
    def digit_sum(number):
        digits = [int(digit) for digit in str(abs(number))]
        if number < 0:
            digits[0] = -digits[0]
        return sum(digits)

    return sorted(nums, key=digit_sum)
