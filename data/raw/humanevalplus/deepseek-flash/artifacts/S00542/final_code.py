import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def _poly_value(coefficients: list, x: float) -> float:
    """Evaluate a polynomial by Horner's rule."""
    value = coefficients[-1]
    for coefficient in reversed(coefficients[:-1]):
        value = value * x + coefficient
    return value


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
    # Ignore leading zero coefficients.  The problem guarantees a non-zero
    # leading coefficient, but doing this also makes the routine safe for
    # otherwise equivalent polynomial representations.
    coefficients = list(xs)
    while coefficients and coefficients[-1] == 0:
        coefficients.pop()

    if not coefficients:
        return 0.0

    degree = len(coefficients) - 1
    if degree == 0:
        # A non-zero constant polynomial has no root.  Returning zero keeps
        # the behavior well-defined for malformed input.
        return 0.0

    if degree == 1:
        return -coefficients[0] / coefficients[1]

    # Start with the ordinary interval [-1, 1] and enlarge it until its
    # endpoints have opposite signs.  An odd-degree polynomial always has
    # such an interval.
    max_float = float.fromhex("0x1.fffffffffffffp+1023")
    bound = 1.0
    low = -bound
    high = bound
    value_low = _poly_value(coefficients, low)
    value_high = _poly_value(coefficients, high)

    while (value_low > 0.0) == (value_high > 0.0):
        if value_low == 0.0:
            return low
        if value_high == 0.0:
            return high

        if bound >= max_float / 2.0:
            # No sign change exists over the finite floating-point range.
            # This is not reached for valid (odd-degree) input.
            break

        bound *= 2.0
        low = -bound
        high = bound
        value_low = _poly_value(coefficients, low)
        value_high = _poly_value(coefficients, high)

    # Bisection is reliable once the endpoints have opposite signs.  The
    # generous iteration limit lets it resolve very small roots as well as
    # roots at the limits of float precision; normally the midpoint stall
    # check terminates much earlier.
    for _ in range(1100):
        midpoint = low / 2.0 + high / 2.0
        if midpoint == low or midpoint == high:
            return midpoint

        value_mid = _poly_value(coefficients, midpoint)
        if value_mid == 0.0:
            return midpoint

        if (value_mid > 0.0) == (value_low > 0.0):
            low = midpoint
            value_low = value_mid
        else:
            high = midpoint
            value_high = value_mid

    return low / 2.0 + high / 2.0
