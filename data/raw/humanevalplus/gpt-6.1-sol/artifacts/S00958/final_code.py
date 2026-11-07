def find_zero(xs: list):
    """Return one real zero of a polynomial of odd degree.

    Coefficients are in ascending order, with a nonzero leading coefficient.
    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    import math

    def elementary_bisection():
        """Use a fixed absolute interval tolerance for ordinary inputs."""
        def evaluate(point):
            return sum([coefficient * math.pow(point, i)
                        for i, coefficient in enumerate(xs)])

        try:
            low, high = -1.0, 1.0
            low_value, high_value = evaluate(low), evaluate(high)
            for _ in range(1025):
                if not math.isfinite(low_value) or not math.isfinite(high_value):
                    return None
                if low_value * high_value <= 0:
                    break
                low, high = low * 2.0, high * 2.0
                low_value, high_value = evaluate(low), evaluate(high)
            else:
                return None
            for _ in range(2200):
                if high - low <= 1e-10:
                    break
                middle = (low + high) / 2.0
                if middle == low or middle == high or not math.isfinite(middle):
                    return None
                middle_value = evaluate(middle)
                if not math.isfinite(middle_value):
                    return None
                if middle_value * low_value > 0:
                    low, low_value = middle, middle_value
                else:
                    high = middle
            else:
                return None
            result = (low + high) / 2.0
            if abs(evaluate(result)) >= 1e-4:
                return None

            # Reject underflow and poorly conditioned apparent zeros before
            # accepting the ordinary floating-point calculation.
            from decimal import Decimal, localcontext, MAX_EMAX, MIN_EMIN
            with localcontext() as context:
                context.prec = 80
                context.Emax = MAX_EMAX
                context.Emin = MIN_EMIN
                point = Decimal(result)
                value = derivative = magnitude = Decimal(0)
                for coefficient in reversed(xs):
                    derivative = derivative * point + value
                    value = value * point + Decimal(coefficient)
                    magnitude = magnitude * abs(point) + abs(Decimal(coefficient))
                if magnitude and abs(value) > magnitude * Decimal('1e-8'):
                    return None
                if value and (not derivative or abs(value / derivative) > Decimal('1e-10')):
                    return None
            return result
        except (ArithmeticError, ValueError):
            return None

    ordinary_root = elementary_bisection()
    if ordinary_root is not None:
        return ordinary_root

    if xs[0] == 0:
        return 0.0
    if len(xs) == 2:
        return -xs[0] / xs[1]

    import math
    from decimal import Decimal, localcontext, MAX_EMAX, MIN_EMIN
    from fractions import Fraction
    import struct

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
            context.Emax = MAX_EMAX
            context.Emin = MIN_EMIN
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
                return result if result else math.copysign(5e-324, precise)

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
            return math.copysign(5e-324, 1 if exact > 0 else -1)
        return result


    def _bisect(coefficients, low, high, low_value, high_value):
        # 2200 halvings cover the complete binary64 exponent range.
        for _ in range(2200):
            middle = low / 2.0 + high / 2.0
            if middle == low or middle == high:
                return min((low, high), key=lambda x: abs(_value(coefficients, x)))
            middle_value = _value(coefficients, middle)
            if low_value != 0.0 and middle_value != 0.0 and (middle_value < 0.0) == (low_value < 0.0):
                low, low_value = middle, middle_value
            else:
                high, high_value = middle, middle_value
        return min((low, high), key=lambda x: abs(_value(coefficients, x)))

    def next_float(value, direction):
        if value == 0.0:
            return math.copysign(5e-324, direction)
        if math.isinf(value):
            if value == direction:
                return value
            return math.copysign(float.fromhex('0x1.fffffffffffffp+1023'), value)
        bits = struct.unpack('>Q', struct.pack('>d', value))[0]
        bits += 1 if (direction > value) == (value > 0.0) else -1
        return struct.unpack('>d', struct.pack('>Q', bits))[0]

    def polish(root):
        candidates = [root]
        left = right = root
        for _ in range(4):
            left = next_float(left, -math.inf)
            right = next_float(right, math.inf)
            candidates.extend((left, right))
        best_root, best_error = root, math.inf
        for candidate in candidates:
            try:
                error = abs(evaluate(xs, candidate))
            except OverflowError:
                continue
            if math.isfinite(error) and error < best_error:
                best_root, best_error = candidate, error
        return best_root, best_error

    # Scale by an exact power of two so evaluation cannot overflow just
    # because all coefficients are large. Preserve coefficients that cannot
    # be represented by the scaled floats by using Decimal instead.
    scale = max(abs(coefficient) for coefficient in xs)
    if scale == 0:
        return 0.0
    try:
        exponent = math.frexp(scale)[1]
        coefficients = [math.ldexp(coefficient, -exponent) for coefficient in xs]
        exact_scale = all(math.ldexp(scaled, exponent) == original
                          for original, scaled in zip(xs, coefficients))
    except (OverflowError, ValueError):
        exact_scale = False
    if not exact_scale:
        coefficients = [Decimal(coefficient) for coefficient in xs]

    # Keep contracting the same bracket even when its upper endpoint or an
    # intermediate point is a zero: there may be another zero to its left.
    low, high = -1.0, 1.0
    low_value = _value(coefficients, low)
    high_value = _value(coefficients, high)
    while low_value != 0.0 and high_value != 0.0 and (low_value < 0.0) == (high_value < 0.0):
        new_high = min(high * 2.0, float.fromhex('0x1.fffffffffffffp+1023'))
        if new_high == high:
            return polish(low if abs(low_value) < abs(high_value) else high)[0]
        low, high = -new_high, new_high
        low_value = _value(coefficients, low)
        high_value = _value(coefficients, high)
    root = _bisect(coefficients, low, high, low_value, high_value)
    best_root, best_error = polish(root)
    if best_error <= 1e-7:
        return best_root

    # Overflow in the public power-sum evaluator does not invalidate the
    # bracketed root; enumerating derivative roots cannot repair that.
    if not math.isfinite(best_error):
        return best_root

    # A large root may lose more precision than a smaller root. Search a
    # fixed number of nearby intervals for alternatives, without recursion.
    radius = 1.0
    for _ in range(5):
        left = -radius
        left_value = _value(coefficients, left)
        for i in range(1, 129):
            right = -radius + (2.0 * radius * i) / 128.0
            right_value = _value(coefficients, right)
            candidate = None
            if left_value == 0.0:
                candidate = left
            elif right_value == 0.0:
                candidate = right
            elif (left_value < 0.0) != (right_value < 0.0):
                candidate = _bisect(coefficients, left, right, left_value, right_value)
            if candidate is not None:
                candidate, error = polish(candidate)
                if error < best_error:
                    best_root, best_error = candidate, error
                if best_error <= 1e-7:
                    return best_root
            left, left_value = right, right_value
        radius *= 2.0
    return best_root


def poly(xs: list, x: float):
    """Evaluate the polynomial at x using ascending-order coefficients."""
    import math
    return sum([coefficient * math.pow(x, i)
                for i, coefficient in enumerate(xs)])
