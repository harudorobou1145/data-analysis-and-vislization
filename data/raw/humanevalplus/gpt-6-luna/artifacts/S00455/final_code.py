
def largest_divisor(n: int) -> int:
    """For a given number n, find the largest number that divides n evenly,
    smaller than n.

    >>> largest_divisor(15)
    5
    """
    if n <= 1:
        raise ValueError("n must be greater than 1")

    # The largest proper divisor is n divided by its smallest divisor greater
    # than 1. If no divisor is found up to sqrt(n), n is prime and the answer
    # is 1.
    divisor = 2
    while divisor * divisor <= n:
        if n % divisor == 0:
            return n // divisor
        divisor += 1
    return 1
