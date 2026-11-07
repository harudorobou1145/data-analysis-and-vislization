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
    left = -100.0
    right = 100.0

    left_value = poly(xs, left)
    right_value = poly(xs, right)
    while left_value * right_value > 0:
        left *= 2.0
        right *= 2.0
        left_value = poly(xs, left)
        right_value = poly(xs, right)

    if left_value == 0.0:
        return left
    if right_value == 0.0:
        return right

    result = None
    for _ in range(200):
        midpoint = left / 2.0 + right / 2.0
        if midpoint == left or midpoint == right:
            result = midpoint
            break

        value = poly(xs, midpoint)
        if value == 0.0:
            result = midpoint
            break

        if (value > 0.0) == (left_value > 0.0):
            left = midpoint
            left_value = value
        else:
            right = midpoint
            right_value = value

    if result is None:
        result = left / 2.0 + right / 2.0

    # Floating-point cancellation can stop bisection very close to an exactly
    # representable integer root. Return the exact integer in that case.
    nearest_integer = round(result)
    if abs(result - nearest_integer) <= 1e-4 * max(1.0, abs(result)):
        if abs(poly(xs, float(nearest_integer))) <= 1e-10:
            return float(nearest_integer)

    return result
