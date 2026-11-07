import math


def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are in ascending order."""
    return sum(coeff * math.pow(x, i) for i, coeff in enumerate(xs))


def find_zero(xs: list):
    """Return a real zero of an odd-degree polynomial.

    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    coefficients = list(xs)
    while coefficients and coefficients[-1] == 0:
        coefficients.pop()
    if not coefficients or coefficients[0] == 0:
        return 0.0
    if len(coefficients) < 2:
        raise ValueError("A nonconstant polynomial is required")
    if len(coefficients) == 2:
        return -coefficients[0] / coefficients[1]

    def evaluate(x):
        # Use the public evaluator when possible so that the returned root
        # also has a small residual under that evaluator's rounding rules.
        try:
            value = poly(coefficients, x)
            if math.isfinite(value):
                return value
        except OverflowError:
            pass
        # For large x, evaluate p(x) / |x|**degree instead. This has the
        # same sign without constructing potentially overflowing powers.
        if abs(x) > 1:
            value = coefficients[0]
            for coefficient in coefficients[1:]:
                value = value / x + coefficient
            if x < 0 and (len(coefficients) - 1) % 2:
                value = -value
            return value
        value = coefficients[-1]
        for coefficient in reversed(coefficients[:-1]):
            value = value * x + coefficient
        return value

    def bisect(left, right, left_value, right_value):
        while True:
            middle = left / 2 + right / 2
            if middle == left or middle == right:
                # Adjacent floats can differ in residual because of rounding
                # in the powers and summation used by poly.
                candidates = [left, right]
                for endpoint in (left, right):
                    candidates.append(math.nextafter(endpoint, -math.inf))
                    candidates.append(math.nextafter(endpoint, math.inf))
                return min(candidates, key=lambda x: abs(evaluate(x)))
            middle_value = evaluate(middle)
            if middle_value == 0:
                return middle
            if (middle_value < 0) == (left_value < 0):
                left, left_value = middle, middle_value
            else:
                right, right_value = middle, middle_value

    # Search outward on both sides of zero. A single large symmetric bracket
    # can skip well-conditioned roots and converge to a much larger root.
    positive = negative = 0.0
    positive_value = negative_value = coefficients[0]
    radius = 1.0
    while True:
        start = positive
        for step in range(1, 33):
            point = start + (radius - start) * (step / 32)
            for sign in (1, -1):
                x = sign * point
                value = evaluate(x)
                if value == 0:
                    return x
                previous = positive if sign == 1 else negative
                previous_value = positive_value if sign == 1 else negative_value
                if (value < 0) != (previous_value < 0):
                    return bisect(previous, x, previous_value, value)
                if sign == 1:
                    positive, positive_value = x, value
                else:
                    negative, negative_value = x, value
        radius *= 2
