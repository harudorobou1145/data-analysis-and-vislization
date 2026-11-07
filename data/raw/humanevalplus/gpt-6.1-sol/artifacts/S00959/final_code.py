def find_zero(xs: list):
    """Return a real zero of an odd-degree polynomial.

    Coefficients are ordered from the constant term to the leading term.
    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    if xs[0] == 0:
        return 0.0
    if len(xs) == 2:
        return -xs[0] / xs[1]

    import math
    import struct
    from decimal import Decimal, Context, localcontext, MAX_EMAX, MIN_EMIN
    from fractions import Fraction

    def evaluate(coefficients, x):
        return sum(coefficient * math.pow(x, i)
                   for i, coefficient in enumerate(coefficients))

    # A power-of-two scale preserves the polynomial exactly whenever all
    # scaled coefficients remain representable as floats.
    try:
        exponent = math.frexp(max(abs(c) for c in xs))[1]
        fast_coefficients = [math.ldexp(c, -exponent) for c in xs]
        if any(math.ldexp(scaled, exponent) != original
               for original, scaled in zip(xs, fast_coefficients)):
            fast_coefficients = None
    except (OverflowError, ValueError):
        fast_coefficients = None
    exact_coefficients = None

    def decimal_value(x):
        # Evaluate p(x)/abs(x)**degree outside the unit interval. This
        # preserves signs and avoids enormous intermediate powers.
        with localcontext(Context(prec=80, Emax=MAX_EMAX, Emin=MIN_EMIN)):
            point = Decimal.from_float(x)
            reverse = abs(x) > 1.0
            argument = 1 / point if reverse else point
            value = magnitude = Decimal(0)
            terms = xs if reverse else reversed(xs)
            for coefficient in terms:
                if isinstance(coefficient, Fraction):
                    coefficient = Decimal(coefficient.numerator) / Decimal(coefficient.denominator)
                else:
                    coefficient = Decimal(coefficient)
                value = value * argument + coefficient
                magnitude = magnitude * abs(argument) + abs(coefficient)
            if reverse and x < 0 and len(xs) % 2 == 0:
                value = -value
            reliable_sign = None
            if abs(value) > magnitude * Decimal('1e-65'):
                reliable_sign = 1 if value > 0 else -1
            return value, magnitude, reliable_sign

    def sign(x):
        nonlocal exact_coefficients
        if fast_coefficients is not None:
            reverse = abs(x) > 1.0
            argument = 1.0 / x if reverse else x
            value = magnitude = 0.0
            terms = fast_coefficients if reverse else reversed(fast_coefficients)
            for coefficient in terms:
                value = value * argument + coefficient
                magnitude = magnitude * abs(argument) + abs(coefficient)
            if reverse and x < 0 and len(xs) % 2 == 0:
                value = -value
            tolerance = 8 * len(xs) * 2.220446049250313e-16
            if magnitude > 1e-280 and abs(value) > magnitude * tolerance:
                return 1 if value > 0 else -1

        value, magnitude, reliable_sign = decimal_value(x)
        if reliable_sign is not None:
            return reliable_sign

        # Exact signs matter near multiple roots, where rounded evaluations
        # can report zero at points that are still far from the actual root.
        if exact_coefficients is None:
            exact_coefficients = [Fraction(c) for c in xs]
        point = Fraction(x)
        exact = Fraction(0)
        for coefficient in reversed(exact_coefficients):
            exact = exact * point + coefficient
        return (exact > 0) - (exact < 0)

    def bisect(low, high, low_sign):
        for _ in range(2200):
            middle = low / 2.0 + high / 2.0
            if middle == low or middle == high:
                return min((low, high), key=lambda point: decimal_value(point)[0].copy_abs())
            middle_sign = sign(middle)
            if middle_sign == 0:
                return middle
            if middle_sign == low_sign:
                low, low_sign = middle, middle_sign
            else:
                high = middle
        return min((low, high), key=lambda point: decimal_value(point)[0].copy_abs())

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

    # Odd degree ensures opposite signs sufficiently far apart.
    low, high = -1.0, 1.0
    low_sign, high_sign = sign(low), sign(high)
    for _ in range(1025):
        if low_sign == 0:
            return low
        if high_sign == 0:
            return high
        if low_sign != high_sign:
            break
        new_high = min(high * 2.0, float.fromhex('0x1.fffffffffffffp+1023'))
        if new_high == high:
            return min((low, high), key=lambda point: decimal_value(point)[0].copy_abs())
        low, high = -new_high, new_high
        low_sign, high_sign = sign(low), sign(high)

    root = bisect(low, high, low_sign)
    best_root, best_error = polish(root)
    if best_error <= 1e-10 or not math.isfinite(best_error):
        return best_root

    # Optional conditioning improvement: a small root may have a much
    # smaller absolute residual than a large root. The bracketed solution
    # above remains the fallback if no other sign change is detected.
    radius = 1.0
    for _ in range(5):
        left = -radius
        left_sign = sign(left)
        for i in range(1, 129):
            right = -radius + 2.0 * radius * i / 128.0
            right_sign = sign(right)
            candidate = None
            if left_sign == 0:
                candidate = left
            elif right_sign == 0:
                candidate = right
            elif left_sign != right_sign:
                candidate = bisect(left, right, left_sign)
            if candidate is not None:
                candidate, error = polish(candidate)
                if error < best_error:
                    best_root, best_error = candidate, error
                if best_error <= 1e-10:
                    return best_root
            left, left_sign = right, right_sign
        radius *= 2.0
    return best_root


def poly(xs: list, x: float):
    """Evaluate the polynomial at x using ascending-order coefficients."""
    import math
    return sum([coefficient * math.pow(x, i)
                for i, coefficient in enumerate(xs)])
