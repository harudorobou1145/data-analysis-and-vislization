import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    if xs[0] == 0:
        return 0.0

    # An odd-degree polynomial has opposite signs sufficiently far apart.
    low, high = -1.0, 1.0
    while True:
        low_value = poly(xs, low)
        high_value = poly(xs, high)
        if low_value == 0:
            return low
        if high_value == 0:
            return high
        if (low_value < 0) != (high_value < 0):
            break
        low *= 2.0
        high *= 2.0

    # Preserve the sign-changing interval until floating-point convergence.
    while True:
        middle = low / 2.0 + high / 2.0
        if middle == low or middle == high:
            return middle
        middle_value = poly(xs, middle)
        if middle_value == 0:
            return middle
        if (middle_value < 0) == (low_value < 0):
            low = middle
            low_value = middle_value
        else:
            high = middle
