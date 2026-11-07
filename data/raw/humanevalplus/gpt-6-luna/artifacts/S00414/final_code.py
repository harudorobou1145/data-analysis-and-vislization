def x_or_y(n, x, y):
    """Return x if n is prime, and y otherwise.

    Examples:
        x_or_y(7, 34, 12) == 34
        x_or_y(15, 8, 5) == 5
    """
    if n < 2:
        return y
    if n == 2:
        return x
    if n % 2 == 0:
        return y

    divisor = 3
    while divisor * divisor <= n:
        if n % divisor == 0:
            return y
        divisor += 2
    return x
