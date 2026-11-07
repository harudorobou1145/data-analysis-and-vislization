import math


def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are in ascending order."""
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def find_zero(xs: list):
    """Return one real zero of a polynomial of odd degree.

    Coefficients are in ascending order, with a nonzero leading coefficient.
    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    import math
    from decimal import Decimal, localcontext
    from fractions import Fraction

    def evaluate(coefficients, x):
        return sum(coefficient * math.pow(x, i)
                   for i, coefficient in enumerate(coefficients))

    def _value(coefficients, x):
        """Evaluate a positive rescaling, verifying uncertain signs exactly."""
        point = Decimal.from_float(x) if isinstance(coefficients[0], Decimal) else x
        reverse = abs(x) > 1.0
        argument = 1 / point if reverse else point
        value = coefficients[0] * 0
        magnitude = value
        terms = coefficients if reverse else reversed(coefficients)
        for coefficient in terms:
            value = value * argument + coefficient
            magnitude = magnitude * abs(argument) + abs(coefficient)
        if reverse and x < 0.0 and len(coefficients) % 2 == 0:
            value = -value
        tolerance = 4 * len(coefficients) * 2.220446049250313e-16
        if isinstance(magnitude, Decimal):
            tolerance = Decimal(tolerance)
        if abs(value) > magnitude * tolerance:
            return value

        # Use more precision before resorting to rational arithmetic. Most
        # ordinary simple roots need only this inexpensive second evaluation.
        with localcontext() as context:
            context.prec = 80
            decimal_point = Decimal.from_float(x)
            precise = Decimal(0)
            magnitude = Decimal(0)
            for coefficient in reversed(coefficients):
                coefficient = Decimal(coefficient)
                precise = precise * decimal_point + coefficient
                magnitude = magnitude * abs(decimal_point) + abs(coefficient)
            if abs(precise) > magnitude * Decimal('1e-65'):
                if reverse:
                    precise /= abs(decimal_point) ** (len(coefficients) - 1)
                result = float(precise)
                return result if result else math.copysign(math.ulp(0.0), precise)

        # Float inputs are rational numbers. Exact evaluation distinguishes a
        # repeated zero from a spurious zero caused by subtractive cancellation.
        point = Fraction(x)
        exact = Fraction(0)
        for coefficient in reversed(coefficients):
            exact = exact * point + Fraction(coefficient)
        if not exact:
            return 0.0
        if reverse:
            exact /= abs(point) ** (len(coefficients) - 1)
        result = float(exact)
        if result == 0.0:
            return math.copysign(math.ulp(0.0), 1 if exact > 0 else -1)
        return result


    def _bisect(coefficients, low, high, low_value, high_value):
        while True:
            middle = low / 2.0 + high / 2.0
            if middle == low or middle == high:
                return min((low, high), key=lambda x: abs(_value(coefficients, x)))
            middle_value = _value(coefficients, middle)
            if middle_value == 0.0:
                return middle
            if (middle_value < 0.0) == (low_value < 0.0):
                low, low_value = middle, middle_value
            else:
                high, high_value = middle, middle_value


    def _real_roots(coefficients):
        """Isolate roots using the turning points supplied by the derivative."""
        while len(coefficients) > 1 and coefficients[-1] == 0:
            coefficients = coefficients[:-1]
        degree = len(coefficients) - 1
        if degree <= 0:
            return []
        if coefficients[0] == 0:
            first_nonzero = 1
            while first_nonzero < len(coefficients) and coefficients[first_nonzero] == 0:
                first_nonzero += 1
            return sorted(set([0.0] + _real_roots(coefficients[first_nonzero:])))
        if degree == 1:
            return [float(-coefficients[0] / coefficients[1])]

        if not isinstance(coefficients[0], Decimal):
            scale = max(abs(coefficient) for coefficient in coefficients)
            exponent = math.frexp(scale)[1]
            normalized = [math.ldexp(coefficient, -exponent)
                          for coefficient in coefficients]
            if any(original != 0 and scaled == 0
                   for original, scaled in zip(coefficients, normalized)):
                # Decimal keeps the full exponent range for extreme input scales.
                with localcontext() as context:
                    context.prec = 1200 + 4 * degree
                    return _real_roots([Decimal(coefficient) for coefficient in coefficients])
            coefficients = normalized
        derivative = [coefficients[i] * i for i in range(1, degree + 1)]
        critical_points = _real_roots(derivative)

        # Fujiwara's root bound, calculated in logarithms to avoid overflowing
        # when the leading coefficient is very small.
        def log_abs(coefficient):
            if isinstance(coefficient, Decimal):
                return float(abs(coefficient).ln())
            return math.log(abs(coefficient))

        leading_log = log_abs(coefficients[-1])
        log_bound = math.log(2.0) + max(
            (log_abs(coefficient) - leading_log) / (degree - i)
            for i, coefficient in enumerate(coefficients[:-1]) if coefficient
        )
        bound = math.exp(min(log_bound, math.log(float.fromhex('0x1.fffffffffffffp+1023'))))
        points = [-bound]
        points.extend(point for point in critical_points if -bound < point < bound)
        points.append(bound)

        roots = []
        low = points[0]
        low_value = _value(coefficients, low)
        if low_value == 0.0:
            roots.append(low)
        for high in points[1:]:
            high_value = _value(coefficients, high)
            if high_value == 0.0:
                roots.append(high)
            elif low_value != 0.0 and (low_value < 0.0) != (high_value < 0.0):
                roots.append(_bisect(coefficients, low, high, low_value, high_value))
            low, low_value = high, high_value
        return sorted(set(roots))

    if xs[0] == 0:
        return 0.0

    roots = _real_roots(xs)
    best_root = None
    best_error = math.inf
    # A smaller root usually needs much less cancellation in poly().
    for root in sorted(roots, key=abs):
        candidates = [root]
        left = right = root
        for _ in range(4):
            left = math.nextafter(left, -math.inf)
            right = math.nextafter(right, math.inf)
            candidates.extend((left, right))
        for candidate in candidates:
            try:
                error = abs(evaluate(xs, candidate))
            except OverflowError:
                error = math.inf
            if not math.isfinite(error):
                error = math.inf
            if best_root is None or error < best_error:
                best_root, best_error = candidate, error
        if best_error <= 1e-10:
            return best_root
    return best_root
