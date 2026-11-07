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
    def evaluate(x):
        # Match the public evaluator's rounding whenever it is finite.
        try:
            value = poly(xs, x)
            if math.isfinite(value):
                return value
        except (OverflowError, ValueError):
            pass
        # Decimal avoids intermediate overflow when only the sign is needed.
        from decimal import Decimal, localcontext
        with localcontext() as context:
            context.prec = 80
            point = Decimal.from_float(float(x))
            value = Decimal(0)
            for coefficient in reversed(xs):
                value = value * point + Decimal(coefficient)
            return value

    if xs[0] == 0:
        return 0.0
    if len(xs) == 2:
        return -xs[0] / xs[1]

    # Search outward in small intervals, favoring roots near the origin.
    # This avoids unnecessarily large roots and their cancellation errors.
    radius = 1.0
    left = right = 0.0
    f_left = f_right = evaluate(0.0)
    bracket = None
    while bracket is None:
        for i in range(1, 17):
            point = radius * i / 16
            if point <= right:
                continue
            for new, old, f_old in ((-point, left, f_left),
                                    (point, right, f_right)):
                value = evaluate(new)
                if value == 0:
                    return new
                if (value < 0) != (f_old < 0):
                    bracket = (old, new, f_old, value)
                    break
            if bracket is not None:
                break
            left, right = -point, point
            f_left, f_right = evaluate(left), evaluate(right)
        radius *= 2

    left, right, f_left, f_right = bracket
    while True:
        middle = left / 2 + right / 2
        if middle == left or middle == right:
            candidates = [left, right]
            for point in (left, right):
                candidates.extend([math.nextafter(point, -math.inf),
                                   math.nextafter(point, math.inf)])
            return min(candidates, key=lambda point: abs(evaluate(point)))
        f_middle = evaluate(middle)
        if f_middle == 0:
            return middle
        if (f_middle < 0) == (f_left < 0):
            left, f_left = middle, f_middle
        else:
            right, f_right = middle, f_middle
