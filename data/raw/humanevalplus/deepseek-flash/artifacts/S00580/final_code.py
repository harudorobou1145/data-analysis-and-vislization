
def order_by_points(nums):
    """
    Write a function which sorts the given list of integers
    in ascending order according to the sum of their digits.
    Note: if there are several items with similar sum of their digits,
    order them based on their index in original list.

    For example:
    >>> order_by_points([1, 11, -1, -11, -12]) == [-1, -11, 1, -12, 11]
    >>> order_by_points([]) == []
    """
    def points(number):
        # The sign of a negative number belongs to its first digit.
        # For instance, the points of -12 are -1 + 2 = 1.
        text = str(number)
        start = 1 if text.startswith("-") else 0
        total = 0
        for position in range(start, len(text)):
            digit = int(text[position])
            if position == start and number < 0:
                digit = -digit
            total += digit
        return total

    return [
        number
        for _, number in sorted(
            enumerate(nums), key=lambda item: (points(item[1]), item[0])
        )
    ]
