import math


def sum_squares(lst):
    """Return the sum of squares after rounding each number upward.

    Each element is rounded to its ceiling integer before being squared.
    """
    return sum(math.ceil(value) ** 2 for value in lst)
