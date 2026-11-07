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
    # Newton-Raphson iteration from a fixed initial value keeps the result
    # deterministic.
    x = 1.0
    for _ in range(100):
        value = poly(xs, x)
        if value == 0.0:
            break

        derivative = sum(
            i * coefficient * math.pow(x, i - 1)
            for i, coefficient in enumerate(xs)
            if i > 0
        )
        if derivative == 0.0 or not math.isfinite(derivative):
            break

        next_x = x - value / derivative
        if not math.isfinite(next_x):
            break
        if next_x == x:
            x = next_x
            break
        x = next_x
    else:
        value = poly(xs, x)

    # Rounding can make Newton's iteration stop a few digits from an exactly
    # representable integer root (notably for repeated roots).
    nearest_integer = round(x)
    if abs(x - nearest_integer) <= 1e-3 and poly(xs, nearest_integer) == 0.0:
        return float(nearest_integer)

    if poly(xs, x) == 0.0:
        return x

    # Fallback for a stationary initial point or unusual convergence:
    # bracket a zero and bisect it.
    left = -1.0
    right = 1.0
    while poly(xs, left) * poly(xs, right) > 0:
        left *= 2.0
        right *= 2.0

    for _ in range(100):
        midpoint = (left + right) / 2.0
        value = poly(xs, midpoint)
        if value == 0.0:
            return midpoint
        if poly(xs, left) * value < 0:
            right = midpoint
        else:
            left = midpoint

    return (left + right) / 2.0
