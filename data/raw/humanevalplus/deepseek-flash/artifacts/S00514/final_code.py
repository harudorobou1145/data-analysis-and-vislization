from math import isqrt


def x_or_y(n, x, y):
    """A simple program which should return the value of x if n is 
    a prime number and should return the value of y otherwise.

    Examples:
    for x_or_y(7, 34, 12) == 34
    for x_or_y(15, 8, 5) == 5
    
    """
    if isinstance(n, bool) or not isinstance(n, int) or n < 2:
        return y

    for divisor in range(2, isqrt(n) + 1):
        if n % divisor == 0:
            return y

    return x
