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
    if not xs:
        raise ValueError("xs must contain polynomial coefficients")

    # Horner's rule avoids constructing large powers explicitly.
    def evaluate(x):
        value = 0.0
        for coefficient in reversed(xs):
            value = value * x + coefficient
        return value

    at_zero = evaluate(0.0)
    if at_zero == 0:
        return 0.0

    leading = xs[-1]
    if leading == 0:
        raise ValueError("the highest-degree coefficient must be nonzero")

    # An odd-degree polynomial has opposite signs at the two ends of the
    # real line. Search in the direction whose limiting sign differs from
    # the value at zero, doubling the interval until it brackets a root.
    direction = 1.0 if (at_zero < 0) != (leading < 0) else -1.0
    bound = 1.0
    edge_value = evaluate(direction * bound)
    while (edge_value == 0 or (edge_value < 0) == (at_zero < 0)):
        if edge_value == 0:
            return direction * bound
        bound *= 2.0
        if not math.isfinite(bound):
            raise OverflowError("root is outside the representable float range")
        edge_value = evaluate(direction * bound)

    # Bisect the bracket. Its endpoints are zero and direction * bound;
    # keeping the endpoint with the same sign as f(0) maintains the bracket.
    left, right = (0.0, direction * bound) if direction > 0 else (direction * bound, 0.0)
    left_value = evaluate(left)
    right_value = evaluate(right)

    for _ in range(1100):
        middle = left + (right - left) / 2.0
        if middle == left or middle == right:
            return middle
        middle_value = evaluate(middle)
        if middle_value == 0:
            return middle
        if (middle_value < 0) == (left_value < 0):
            left, left_value = middle, middle_value
        else:
            right, right_value = middle, middle_value
    return left + (right - left) / 2.0
