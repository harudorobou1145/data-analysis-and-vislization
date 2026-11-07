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
    left = -1
    right = 1

    while poly(xs, left) * poly(xs, right) > 0:
        left *= 2
        right *= 2

    # A zero at the left endpoint is already a valid answer.  Handling it
    # separately also avoids a degenerate interval when the right endpoint is
    # merely non-zero rather than a root.
    if poly(xs, left) == 0 and poly(xs, right) != 0:
        return left

    while right - left > 1e-6:
        midpoint = (left + right) / 2
        if poly(xs, midpoint) == 0:
            return midpoint
        if poly(xs, left) * poly(xs, midpoint) < 0:
            right = midpoint
        else:
            left = midpoint

    return (left + right) / 2
