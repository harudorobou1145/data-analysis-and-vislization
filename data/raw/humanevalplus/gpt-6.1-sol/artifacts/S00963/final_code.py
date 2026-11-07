import math
from fractions import Fraction


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[2] * x^2 + .... xs[n] * x^n
    """
    try:
        value = sum(coeff * math.pow(x, i) for i, coeff in enumerate(xs))
        if math.isfinite(value):
            return value
    except OverflowError:
        pass

    # A power can overflow even when its coefficient makes the term small.
    # Exact Horner evaluation also handles cancellation of very large terms.
    point = Fraction(x)
    value = Fraction(0)
    for coeff in reversed(xs):
        value = value * point + Fraction(coeff)
    try:
        return float(value)
    except OverflowError:
        return math.inf if value > 0 else -math.inf


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
    # A common positive denominator turns all coefficients into integers.
    # This preserves signs without losing small coefficients to underflow.
    ratios = [Fraction(coeff) for coeff in xs]
    while ratios and not ratios[-1]:
        ratios.pop()
    if not ratios or not ratios[0]:
        return 0.0
    if len(ratios) == 1:
        raise ValueError("a nonzero constant polynomial has no zero")
    if len(ratios) == 2:
        return float(-ratios[0] / ratios[1])

    denominator = 1
    for coeff in ratios:
        denominator = math.lcm(denominator, coeff.denominator)
    coefficients = [
        coeff.numerator * (denominator // coeff.denominator)
        for coeff in ratios
    ]
    degree = len(coefficients) - 1

    def evaluate(point):
        # A finite float is a rational whose denominator is a power of two.
        # Return the numerator of denominator * p(point); its sign is exact.
        numerator, divisor = point.as_integer_ratio()
        shift = divisor.bit_length() - 1
        value = coefficients[-1]
        for power, coeff in enumerate(reversed(coefficients[:-1]), 1):
            value = value * numerator + (coeff << (shift * power))
        return value, shift * degree

    lower, upper = -1.0, 1.0
    lower_value, lower_shift = evaluate(lower)
    upper_value, upper_shift = evaluate(upper)

    # An odd-degree polynomial eventually has opposite signs at these bounds.
    while True:
        if lower_value == 0:
            return lower
        if upper_value == 0:
            return upper
        if (lower_value < 0) != (upper_value < 0):
            break
        next_upper = upper * 2.0
        if math.isinf(next_upper):
            next_upper = float.fromhex('0x1.fffffffffffffp+1023')
        if next_upper == upper:
            raise OverflowError("no root can be bracketed by finite floats")
        lower, upper = -next_upper, next_upper
        lower_value, lower_shift = evaluate(lower)
        upper_value, upper_shift = evaluate(upper)

    while True:
        # Halving each endpoint also works when upper - lower overflows.
        middle = lower / 2.0 + upper / 2.0
        if middle == lower or middle == upper:
            # Compare residuals with their exact, possibly different scales.
            if (abs(lower_value) << upper_shift) <= (abs(upper_value) << lower_shift):
                return lower
            return upper

        middle_value, middle_shift = evaluate(middle)
        if middle_value == 0:
            return middle
        if (middle_value < 0) == (lower_value < 0):
            lower, lower_value, lower_shift = middle, middle_value, middle_shift
        else:
            upper, upper_value, upper_shift = middle, middle_value, middle_shift
