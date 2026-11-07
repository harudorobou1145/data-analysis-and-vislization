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

    def isolate_roots(coefs):
        """Partition the real line at derivative roots into monotone pieces."""
        order = len(coefs) - 1
        if order == 1:
            try:
                root = float(Fraction(-coefs[0], coefs[1]))
            except OverflowError:
                return []
            return [root]

        critical = isolate_roots([i * coefs[i] for i in range(1, order + 1)])
        # Cauchy's bound encloses every real root, including those of an
        # even-degree derivative whose endpoint signs may be identical.
        bound_ratio = 1 + max(Fraction(abs(c), abs(coefs[-1]))
                              for c in coefs[:-1])
        try:
            bound = float(bound_ratio)
        except OverflowError:
            bound = float.fromhex('0x1.fffffffffffffp+1023')
        if math.isfinite(bound * 2.0):
            bound *= 2.0
        points = [-bound] + sorted(set(x for x in critical if -bound < x < bound)) + [bound]

        def exact(point):
            numerator, divisor = point.as_integer_ratio()
            shift = divisor.bit_length() - 1
            value = coefs[-1]
            for power, coeff in enumerate(reversed(coefs[:-1]), 1):
                value = value * numerator + (coeff << (shift * power))
            return value, shift * order

        roots = []
        previous = points[0]
        previous_value, previous_shift = exact(previous)
        if previous_value == 0:
            roots.append(previous)
        for point in points[1:]:
            value, shift = exact(point)
            if value == 0:
                roots.append(point)
            elif previous_value and (previous_value < 0) != (value < 0):
                lower, upper = previous, point
                lower_value, upper_value = previous_value, value
                lower_shift, upper_shift = previous_shift, shift
                while True:
                    middle = lower / 2.0 + upper / 2.0
                    if middle == lower or middle == upper:
                        if (abs(lower_value) << upper_shift) <= (abs(upper_value) << lower_shift):
                            roots.append(lower)
                        else:
                            roots.append(upper)
                        break
                    middle_value, middle_shift = exact(middle)
                    if middle_value == 0:
                        roots.append(middle)
                        break
                    if (middle_value < 0) == (lower_value < 0):
                        lower, lower_value, lower_shift = middle, middle_value, middle_shift
                    else:
                        upper, upper_value, upper_shift = middle, middle_value, middle_shift
            previous, previous_value, previous_shift = point, value, shift
        return roots

    def finish(root):
        def residual(point):
            try:
                result = sum(coeff * math.pow(point, i)
                             for i, coeff in enumerate(xs))
                return abs(result) if math.isfinite(result) else math.inf
            except (OverflowError, RuntimeWarning):
                return math.inf

        error = residual(root)
        if error <= 1e-10:
            return root
        best = root

        def consider(point):
            nonlocal best, error
            for candidate in (point, math.nextafter(point, -math.inf),
                              math.nextafter(point, math.inf)):
                if math.isfinite(candidate):
                    candidate_error = residual(candidate)
                    if candidate_error < error:
                        best, error = candidate, candidate_error

        consider(root)
        if error > 1e-7 and 2 < len(ratios) <= 33:
            # A different zero may have a much smaller absolute residual.
            # Isolate alternatives using the polynomial's turning points.
            for alternative in isolate_roots(coefficients):
                consider(alternative)
                if error <= 1e-10:
                    break
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
    if not ratios:
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

    # Expand a single bracket. Do not accept the upper endpoint too early:
    # there may be another zero inside the bracket that bisection selects.
    lower, upper = -1.0, 1.0
    lower_value, lower_shift = evaluate(lower)
    upper_value, upper_shift = evaluate(upper)
    while lower_value and upper_value and (lower_value < 0) == (upper_value < 0):
        next_upper = upper * 2.0
        if math.isinf(next_upper):
            next_upper = float.fromhex('0x1.fffffffffffffp+1023')
        if next_upper == upper:
            raise OverflowError("no root can be bracketed by finite floats")
        lower, upper = -next_upper, next_upper
        lower_value, lower_shift = evaluate(lower)
        upper_value, upper_shift = evaluate(upper)
    if lower_value == 0:
        return finish(lower)

    while True:
        if upper_value == 0 and upper - lower <= 1e-10:
            return finish(upper)
        middle = lower / 2.0 + upper / 2.0
        if middle == lower or middle == upper:
            # Both numerators use the same coefficient scale; account for
            # their different powers of the point's binary denominator.
            if (abs(lower_value) << upper_shift) <= (abs(upper_value) << lower_shift):
                return finish(lower)
            return finish(upper)
        middle_value, middle_shift = evaluate(middle)
        if middle_value == 0 and upper - lower <= 1e-10:
            return finish(middle)
        if middle_value != 0 and (middle_value < 0) == (lower_value < 0):
            lower, lower_value, lower_shift = middle, middle_value, middle_shift
        else:
            upper, upper_value, upper_shift = middle, middle_value, middle_shift
