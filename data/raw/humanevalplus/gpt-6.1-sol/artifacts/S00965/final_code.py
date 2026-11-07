import math
from fractions import Fraction


def poly(xs: list, x: float):
    """Evaluate xs[0] + xs[1] * x + ... + xs[n] * x**n."""
    try:
        value = sum(coeff * math.pow(x, i) for i, coeff in enumerate(xs))
        if math.isfinite(value):
            return value
    except (OverflowError, RuntimeWarning):
        pass

    # Individual powers can overflow even when the polynomial is finite.
    point = Fraction(x)
    value = Fraction(0)
    for coeff in reversed(xs):
        try:
            numerator, divisor = coeff.as_integer_ratio()
        except AttributeError:
            ratio = Fraction(coeff)
            numerator, divisor = ratio.numerator, ratio.denominator
        ratio = Fraction(int(numerator), int(divisor))
        value = value * point + ratio
    try:
        return float(value)
    except OverflowError:
        return math.inf if value > 0 else -math.inf


def find_zero(xs: list):
    """Return a real zero of a polynomial with an odd degree.

    Coefficients are ordered from the constant to the leading coefficient.
    The leading coefficient must be nonzero.

    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    import math
    from fractions import Fraction

    def finish(root):
        # Adjacent floats can have different errors in the public power sum.
        # Only adjust a converged answer if that evaluation loses accuracy.
        def residual(point):
            try:
                result = sum(coeff * math.pow(point, i)
                             for i, coeff in enumerate(xs))
                return abs(result) if math.isfinite(result) else math.inf
            except OverflowError:
                return math.inf

        error = residual(root)
        if error <= 1e-10:
            return root
        best = root
        for point in (math.nextafter(root, -math.inf),
                      math.nextafter(root, math.inf)):
            if math.isfinite(point):
                candidate_error = residual(point)
                if candidate_error < error:
                    best, error = point, candidate_error
        return best

    # Integer coefficients with a common positive denominator allow exact
    # signs, even with cancellation, underflow, or very large powers.
    ratios = []
    for coeff in xs:
        try:
            numerator, divisor = coeff.as_integer_ratio()
        except AttributeError:
            ratio = Fraction(coeff)
            numerator, divisor = ratio.numerator, ratio.denominator
        # Some integer scalar classes retain fixed-width numerators inside
        # Fraction. Cast both parts to Python ints before any arithmetic.
        ratios.append(Fraction(int(numerator), int(divisor)))
    while ratios and not ratios[-1]:
        ratios.pop()
    if not ratios or not ratios[0]:
        return 0.0
    if len(ratios) == 1:
        raise ValueError("a nonzero constant polynomial has no zero")
    if len(ratios) == 2:
        return finish(float(-ratios[0] / ratios[1]))

    denominator = 1
    for coeff in ratios:
        denominator = (denominator // math.gcd(denominator, coeff.denominator)
                       * coeff.denominator)
    coefficients = [coeff.numerator * (denominator // coeff.denominator)
                    for coeff in ratios]
    degree = len(coefficients) - 1
    terms = list(reversed(coefficients[:-1]))

    def evaluate(point):
        numerator, divisor = point.as_integer_ratio()
        shift = divisor.bit_length() - 1
        value = coefficients[-1]
        for power, coeff in enumerate(terms, 1):
            value = value * numerator + (coeff << (shift * power))
        return value, shift * degree

    # Look for a nearby zero before considering large roots, whose absolute
    # evaluation errors can be amplified by the powers of x. Sampling both
    # sides also catches sign changes missed by symmetric endpoint brackets.
    radius = 0.0
    next_radius = 1.0
    negative_value = positive_value = coefficients[0]
    negative_shift = positive_shift = 0
    bracket = None
    while bracket is None:
        span = next_radius - radius
        previous = radius
        for part in range(1, 17):
            point = radius + span * (part / 16.0)
            left_value, left_shift = evaluate(-point)
            right_value, right_shift = evaluate(point)
            if left_value == 0:
                return finish(-point)
            if right_value == 0:
                return finish(point)
            if (left_value < 0) != (negative_value < 0):
                bracket = (-point, -previous, left_value, negative_value,
                           left_shift, negative_shift)
                break
            if (right_value < 0) != (positive_value < 0):
                bracket = (previous, point, positive_value, right_value,
                           positive_shift, right_shift)
                break
            previous = point
            negative_value, negative_shift = left_value, left_shift
            positive_value, positive_shift = right_value, right_shift
        if bracket is None:
            radius = next_radius
            next_radius *= 2.0
            if math.isinf(next_radius):
                next_radius = float.fromhex('0x1.fffffffffffffp+1023')
            if next_radius == radius:
                raise OverflowError("no root can be bracketed by finite floats")

    lower, upper, lower_value, upper_value, lower_shift, upper_shift = bracket
    while True:
        middle = lower / 2.0 + upper / 2.0
        if middle == lower or middle == upper:
            # Both numerators use the same coefficient scale; account for
            # their different powers of the point's binary denominator.
            if (abs(lower_value) << upper_shift) <= (abs(upper_value) << lower_shift):
                return finish(lower)
            return finish(upper)
        middle_value, middle_shift = evaluate(middle)
        if middle_value == 0:
            return finish(middle)
        if (middle_value < 0) == (lower_value < 0):
            lower, lower_value, lower_shift = middle, middle_value, middle_shift
        else:
            upper, upper_value, upper_shift = middle, middle_value, middle_shift
