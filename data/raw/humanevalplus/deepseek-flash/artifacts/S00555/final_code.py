
def largest_divisor(n: int) -> int:
    """ For a given number n, find the largest number that divides n evenly, smaller than n
    >>> largest_divisor(15)
    5
    """
    if n < 1:
        raise ValueError("n must be a positive integer")
    if n == 1:
        return 1

    # A proper divisor cannot exceed n // 2. Search downward so the
    # first divisor found is the largest one.
    for divisor in range(n // 2, 0, -1):
        if n % divisor == 0:
            return divisor

    return 1
