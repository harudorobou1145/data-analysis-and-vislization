from math import ceil


def sum_squares(lst):
    """Return the sum of squares after rounding each number up to an integer."""
    return sum(ceil(number) ** 2 for number in lst)
